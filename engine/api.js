// engine/api.js - FINAL COMPLETE VERSION
import { healthChecker } from './health-check.js';
import { db } from './database.js';
import { logger } from './logger.js';

export async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Authentication middleware
  const authResult = await authenticateRequest(request);
  if (!authResult.authenticated) {
    return Response.json(
      { error: 'Unauthorized', message: authResult.message },
      { status: 401, headers: getCorsHeaders() }
    );
  }
  
  try {
    // API routing
    switch (true) {
      case path === '/api/health':
        return await handleHealthCheck();
        
      case path === '/api/features':
        return await handleFeaturesList();
        
      case path === '/api/stats':
        return await handleStatistics();
        
      case path === '/api/backups':
        return await handleBackups(request);
        
      case path.startsWith('/api/reports'):
        return await handleReports(request, path);
        
      case path.startsWith('/api/users'):
        return await handleUsers(request, path);
        
      case path.startsWith('/api/groups'):
        return await handleGroups(request, path);
        
      case path === '/api/config':
        return await handleConfig(request);
        
      default:
        return Response.json(
          { error: 'Not Found', message: 'API endpoint not found' },
          { status: 404, headers: getCorsHeaders() }
        );
    }
  } catch (error) {
    logger.error('API error:', error);
    return Response.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

async function authenticateRequest(request) {
  // Simple API key authentication
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.API_KEY;
  
  if (!expectedKey) {
    // If no API key is configured, allow all requests (for development)
    return { authenticated: true };
  }
  
  if (!apiKey || apiKey !== expectedKey) {
    return { 
      authenticated: false, 
      message: 'Invalid or missing API key' 
    };
  }
  
  return { authenticated: true };
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Content-Type': 'application/json'
  };
}

async function handleHealthCheck() {
  const health = await healthChecker.checkAll();
  return Response.json(health, { headers: getCorsHeaders() });
}

async function handleFeaturesList() {
  const { loadAllFeatures } = await import('./loader.js');
  const { features, versions } = await loadAllFeatures();
  
  return Response.json({
    count: features.length,
    features: features.map(f => ({
      name: f.name,
      version: f.version,
      description: f.description,
      events: f.events,
      permissions: f.permissions
    })),
    versions: versions.map(v => ({
      name: v.name,
      status: v.status,
      features: v.features
    }))
  }, { headers: getCorsHeaders() });
}

async function handleStatistics() {
  if (!db) {
    return Response.json(
      { error: 'Database not configured' },
      { status: 503, headers: getCorsHeaders() }
    );
  }
  
  const [
    usersCount,
    groupsCount,
    reportsCount,
    activeReports,
    todayReports
  ] = await Promise.all([
    db.query('SELECT COUNT(*) FROM users'),
    db.query('SELECT COUNT(*) FROM groups WHERE is_active = true'),
    db.query('SELECT COUNT(*) FROM reports'),
    db.query('SELECT COUNT(*) FROM reports WHERE status = $1', ['pending']),
    db.query('SELECT COUNT(*) FROM reports WHERE created_at >= CURRENT_DATE')
  ]);
  
  return Response.json({
    users: parseInt(usersCount.rows[0].count),
    active_groups: parseInt(groupsCount.rows[0].count),
    total_reports: parseInt(reportsCount.rows[0].count),
    pending_reports: parseInt(activeReports.rows[0].count),
    today_reports: parseInt(todayReports.rows[0].count),
    platform: {
      version: '1.0.0',
      uptime: process.uptime(),
      last_updated: new Date().toISOString()
    }
  }, { headers: getCorsHeaders() });
}

async function handleBackups(request) {
  if (request.method === 'GET') {
    // List backups
    const result = await db.query(
      'SELECT backup_id, created_at FROM backups ORDER BY created_at DESC LIMIT 10'
    );
    
    return Response.json({
      backups: result.rows,
      count: result.rowCount
    }, { headers: getCorsHeaders() });
  }
  
  if (request.method === 'POST') {
    // Create backup
    const { createBackup } = await import('./backup-system.js');
    const backupSystem = new (await import('./backup-system.js')).BackupSystem();
    const backupId = await backupSystem.createBackup();
    
    return Response.json({
      success: true,
      backup_id: backupId,
      message: 'Backup created successfully'
    }, { 
      status: 201,
      headers: getCorsHeaders() 
    });
  }
  
  return Response.json(
    { error: 'Method not allowed' },
    { status: 405, headers: getCorsHeaders() }
  );
}

async function handleReports(request, path) {
  if (!db) {
    return Response.json(
      { error: 'Database not configured' },
      { status: 503, headers: getCorsHeaders() }
    );
  }
  
  if (path === '/api/reports' && request.method === 'GET') {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = parseInt(searchParams.get('offset')) || 0;
    
    const result = await db.query(
      `SELECT r.*, 
              u1.username as target_username,
              u2.username as reporter_username
       FROM reports r
       LEFT JOIN users u1 ON r.target_user_id = u1.telegram_id
       LEFT JOIN users u2 ON r.reporter_id = u2.telegram_id
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
    
    const countResult = await db.query(
      'SELECT COUNT(*) FROM reports WHERE status = $1',
      [status]
    );
    
    return Response.json({
      reports: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
        has_more: offset + result.rowCount < parseInt(countResult.rows[0].count)
      }
    }, { headers: getCorsHeaders() });
  }
  
  // Handle specific report
  const reportId = path.split('/').pop();
  if (reportId && request.method === 'GET') {
    const result = await db.query(
      `SELECT r.*, 
              u1.username as target_username,
              u1.first_name as target_first_name,
              u2.username as reporter_username,
              u2.first_name as reporter_first_name
       FROM reports r
       LEFT JOIN users u1 ON r.target_user_id = u1.telegram_id
       LEFT JOIN users u2 ON r.reporter_id = u2.telegram_id
       WHERE r.id = $1`,
      [reportId]
    );
    
    if (result.rowCount === 0) {
      return Response.json(
        { error: 'Report not found' },
        { status: 404, headers: getCorsHeaders() }
      );
    }
    
    return Response.json({
      report: result.rows[0]
    }, { headers: getCorsHeaders() });
  }
  
  return Response.json(
    { error: 'Not Found' },
    { status: 404, headers: getCorsHeaders() }
  );
}

async function handleUsers(request, path) {
  if (!db) {
    return Response.json(
      { error: 'Database not configured' },
      { status: 503, headers: getCorsHeaders() }
    );
  }
  
  const userId = path.split('/').pop();
  
  if (userId && request.method === 'GET') {
    const result = await db.query(
      `SELECT u.*, 
              COUNT(DISTINCT r.id) as report_count,
              COUNT(DISTINCT w.id) as warning_count
       FROM users u
       LEFT JOIN reports r ON u.telegram_id = r.target_user_id
       LEFT JOIN warnings w ON u.telegram_id = w.user_id
       WHERE u.telegram_id = $1
       GROUP BY u.id`,
      [parseInt(userId)]
    );
    
    if (result.rowCount === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404, headers: getCorsHeaders() }
      );
    }
    
    return Response.json({
      user: result.rows[0]
    }, { headers: getCorsHeaders() });
  }
  
  return Response.json(
    { error: 'Not Found' },
    { status: 404, headers: getCorsHeaders() }
  );
}

async function handleGroups(request, path) {
  if (!db) {
    return Response.json(
      { error: 'Database not configured' },
      { status: 503, headers: getCorsHeaders() }
    );
  }
  
  const groupId = path.split('/').pop();
  
  if (groupId && request.method === 'GET') {
    const result = await db.query(
      `SELECT g.*, 
              COUNT(DISTINCT r.id) as report_count
       FROM groups g
       LEFT JOIN reports r ON g.telegram_id = r.chat_id
       WHERE g.telegram_id = $1
       GROUP BY g.id`,
      [parseInt(groupId)]
    );
    
    if (result.rowCount === 0) {
      return Response.json(
        { error: 'Group not found' },
        { status: 404, headers: getCorsHeaders() }
      );
    }
    
    return Response.json({
      group: result.rows[0]
    }, { headers: getCorsHeaders() });
  }
  
  return Response.json(
    { error: 'Not Found' },
    { status: 404, headers: getCorsHeaders() }
  );
}

async function handleConfig(request) {
  if (request.method === 'GET') {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chat_id');
    
    if (!chatId) {
      return Response.json(
        { error: 'chat_id parameter is required' },
        { status: 400, headers: getCorsHeaders() }
      );
    }
    
    const result = await db.query(
      'SELECT config_key, config_value FROM bot_configs WHERE chat_id = $1',
      [parseInt(chatId)]
    );
    
    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });
    
    return Response.json({
      chat_id: chatId,
      config,
      count: result.rowCount
    }, { headers: getCorsHeaders() });
  }
  
  return Response.json(
    { error: 'Method not allowed' },
    { status: 405, headers: getCorsHeaders() }
  );
}
