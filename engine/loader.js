// Feature auto-loader
export async function loadAllFeatures() {
  const features = [];
  const versions = [];
  
  try {
    // Load master config
    const masterConfig = JSON.parse(await fetch('./master.json').then(r => r.text()));
    
    // Scan versions directory
    const versionDirs = ['v1']; // Auto-detect in future
    
    for (const versionDir of versionDirs) {
      try {
        // Load version config
        const versionConfig = JSON.parse(
          await fetch(`./versions/${versionDir}/version.json`).then(r => r.text())
        );
        
        if (versionConfig.status === 'active') {
          versions.push({
            name: versionConfig.version,
            description: versionConfig.description,
            features: []
          });
          
          // Scan for feature files
          const featureFiles = [
            'admin.feature.js',
            'welcome.feature.js',
            'autoreply.feature.js',
            'report.feature.js'
          ];
          
          for (const featureFile of featureFiles) {
            try {
              const module = await import(`../versions/${versionDir}/${featureFile}`);
              
              if (module.default && typeof module.default === 'object') {
                const feature = module.default;
                feature.version = versionConfig.version;
                features.push(feature);
                versions[versions.length - 1].features.push(feature.name);
              }
            } catch (e) {
              console.log(`No ${featureFile} in ${versionDir}`);
            }
          }
        }
      } catch (e) {
        console.error(`Error loading ${versionDir}:`, e);
      }
    }
    
    console.log(`Loaded ${features.length} features from ${versions.length} versions`);
    return { features, versions };
    
  } catch (error) {
    console.error('Failed to load features:', error);
    return { features: [], versions: [] };
  }
}
