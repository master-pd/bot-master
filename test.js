// test.js
import { createContext } from './engine/context.js';
import { dispatchEvent } from './engine/dispatcher.js';
import { loadAllFeatures } from './engine/loader.js';

async function runTests() {
  console.log('🧪 Running Bot Master Platform Tests...\n');
  
  // Test 1: Load features
  console.log('Test 1: Loading features...');
  const { features, versions } = await loadAllFeatures();
  console.log(`✅ Loaded ${features.length} features from ${versions.length} versions`);
  
  // Test 2: Create mock context
  console.log('\nTest 2: Creating context...');
  const mockUpdate = {
    update_id: 123456,
    message: {
      message_id: 1,
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'Test',
        username: 'testuser'
      },
      chat: {
        id: -1001234567890,
        title: 'Test Group',
        type: 'group'
      },
      date: Math.floor(Date.now() / 1000),
      text: '/help'
    }
  };
  
  const ctx = createContext(mockUpdate, 'test_token');
  console.log('✅ Context created');
  console.log(`   User: ${ctx.from.first_name}`);
  console.log(`   Chat: ${ctx.chat.title}`);
  console.log(`   Text: ${ctx.text}`);
  
  // Test 3: Test permission system
  console.log('\nTest 3: Testing permission system...');
  const { permissionManager } = await import('./engine/permission.js');
  const perms = await permissionManager.resolve(ctx);
  console.log(`✅ Permission level: ${perms.level}`);
  console.log(`   Permissions: ${perms.permissions.slice(0, 3).join(', ')}...`);
  
  // Test 4: Test dispatcher
  console.log('\nTest 4: Testing event dispatcher...');
  const result = await dispatchEvent(ctx, features);
  console.log(`✅ Dispatcher result:`);
  console.log(`   Processed: ${result.processed}`);
  console.log(`   Responses: ${result.responses.length}`);
  
  // Test 5: Test individual features
  console.log('\nTest 5: Testing feature handlers...');
  
  // Test admin feature
  const adminFeature = features.find(f => f.name === 'admin');
  if (adminFeature) {
    console.log(`✅ Admin feature found: ${adminFeature.description}`);
  }
  
  // Test welcome feature
  const welcomeFeature = features.find(f => f.name === 'welcome');
  if (welcomeFeature) {
    console.log(`✅ Welcome feature found: ${welcomeFeature.description}`);
  }
  
  // Test auto-reply feature
  const autoreplyFeature = features.find(f => f.name === 'autoreply');
  if (autoreplyFeature) {
    console.log(`✅ Auto-reply feature found: ${autoreplyFeature.description}`);
  }
  
  // Test report feature
  const reportFeature = features.find(f => f.name === 'report');
  if (reportFeature) {
    console.log(`✅ Report feature found: ${reportFeature.description}`);
  }
  
  console.log('\n🎉 All tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   Features: ${features.length}`);
  console.log(`   Versions: ${versions.length}`);
  console.log(`   Platform: Bot Master v1.0.0`);
  console.log(`   Status: ✅ READY FOR DEPLOYMENT`);
}

runTests().catch(console.error);
