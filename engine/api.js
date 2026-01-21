// API handler
export async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Simple API routing
  switch (path) {
    case '/api/status':
      return new Response(JSON.stringify({
        status: 'online',
        timestamp: new Date().toISOString(),
        platform: env.PLATFORM_NAME || 'Bot Master'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    case '/api/features':
      return new Response(JSON.stringify({
        features: ['admin', 'welcome', 'autoreply', 'report'],
        versions: ['v1']
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    default:
      return new Response(JSON.stringify({
        error: 'API endpoint not found',
        available: ['/api/status', '/api/features']
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}
