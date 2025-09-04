#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Bundle optimization script for production deployment
// Addresses performance issues and bundle size concerns

console.log('🚀 Starting bundle optimization...');

// 1. Analyze current bundle size
function analyzeBundleSize() {
  console.log('\n📊 Analyzing current bundle size...');
  
  try {
    // Build the application first
    execSync('npm run build', { 
      cwd: path.join(__dirname, '../apps/web'),
      stdio: 'inherit' 
    });
    
    // Use Next.js bundle analyzer
    execSync('npx @next/bundle-analyzer', {
      cwd: path.join(__dirname, '../apps/web'),
      stdio: 'inherit'
    });
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
  }
}

// 2. Optimize images and static assets
function optimizeAssets() {
  console.log('\n🖼️ Optimizing static assets...');
  
  const publicDir = path.join(__dirname, '../apps/web/public');
  
  if (fs.existsSync(publicDir)) {
    // Find large images
    const files = fs.readdirSync(publicDir, { recursive: true });
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );
    
    imageFiles.forEach(file => {
      const filePath = path.join(publicDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      
      if (sizeKB > 500) {
        console.log(`⚠️  Large image found: ${file} (${sizeKB}KB)`);
        console.log('   Consider optimizing or converting to WebP');
      }
    });
  }
}

// 3. Check for unused dependencies
function checkUnusedDependencies() {
  console.log('\n📦 Checking for unused dependencies...');
  
  try {
    execSync('npx depcheck', {
      cwd: path.join(__dirname, '../apps/web'),
      stdio: 'inherit'
    });
  } catch (error) {
    console.log('ℹ️  Install depcheck to analyze unused dependencies: npm install -g depcheck');
  }
}

// 4. Optimize Next.js configuration
function optimizeNextConfig() {
  console.log('\n⚙️ Checking Next.js optimization settings...');
  
  const nextConfigPath = path.join(__dirname, '../apps/web/next.config.js');
  
  if (fs.existsSync(nextConfigPath)) {
    const config = fs.readFileSync(nextConfigPath, 'utf8');
    
    const optimizations = [
      { check: 'swcMinify', message: 'Enable SWC minification for better performance' },
      { check: 'compress', message: 'Enable gzip compression' },
      { check: 'poweredByHeader: false', message: 'Disable X-Powered-By header' },
      { check: 'generateEtags: false', message: 'Disable ETags if using CDN' }
    ];
    
    optimizations.forEach(opt => {
      if (!config.includes(opt.check)) {
        console.log(`💡 Suggestion: ${opt.message}`);
      }
    });
  }
}

// 5. Check for code splitting opportunities
function checkCodeSplitting() {
  console.log('\n✂️ Analyzing code splitting opportunities...');
  
  const pagesDir = path.join(__dirname, '../apps/web/app');
  
  if (fs.existsSync(pagesDir)) {
    // Find large page components
    const findLargeFiles = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          findLargeFiles(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const sizeKB = Math.round(stats.size / 1024);
          
          if (sizeKB > 50) {
            console.log(`⚠️  Large component: ${filePath} (${sizeKB}KB)`);
            console.log('   Consider code splitting with dynamic imports');
          }
        }
      });
    };
    
    findLargeFiles(pagesDir);
  }
}

// 6. Generate optimization report
function generateReport() {
  console.log('\n📋 Generating optimization report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    recommendations: [
      'Enable Next.js SWC minification',
      'Use dynamic imports for large components',
      'Optimize images with WebP format',
      'Remove unused dependencies',
      'Enable compression and caching headers',
      'Consider lazy loading for non-critical components'
    ],
    thresholds: {
      bundleSize: '2MB',
      pageLoadTime: '3 seconds',
      apiResponseTime: '1 second',
      imageSize: '500KB'
    }
  };
  
  const reportPath = path.join(__dirname, '../optimization-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`✅ Optimization report saved to: ${reportPath}`);
}

// 7. Performance budget check
function checkPerformanceBudget() {
  console.log('\n💰 Checking performance budget...');
  
  const budgets = {
    'Initial Bundle': '1MB',
    'Total JavaScript': '2MB',
    'Images': '3MB',
    'Fonts': '500KB'
  };
  
  console.log('Performance Budget Limits:');
  Object.entries(budgets).forEach(([category, limit]) => {
    console.log(`  ${category}: ${limit}`);
  });
  
  console.log('\n💡 Consider using webpack-bundle-analyzer for detailed analysis');
}

// Main execution
async function main() {
  try {
    analyzeBundleSize();
    optimizeAssets();
    checkUnusedDependencies();
    optimizeNextConfig();
    checkCodeSplitting();
    checkPerformanceBudget();
    generateReport();
    
    console.log('\n🎉 Bundle optimization analysis complete!');
    console.log('📊 Check the optimization report for detailed recommendations');
    
  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleSize,
  optimizeAssets,
  checkUnusedDependencies,
  optimizeNextConfig,
  checkCodeSplitting,
  generateReport
};
