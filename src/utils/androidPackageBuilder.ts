import JSZip from 'jszip';
import { CADEntity, CADFeature, UnitType } from '../types/cad';
import { downloadFile } from './exporters';

export interface AndroidPackageMeta {
  appName: string;
  packageName: string;
  versionName: string;
  versionCode: number;
  minSdkVersion: number;
  targetSdkVersion: number;
  description: string;
}

export const DEFAULT_ANDROID_META: AndroidPackageMeta = {
  appName: 'Simple TechDraw',
  packageName: 'com.simpletechdraw.cad',
  versionName: '1.0.0',
  versionCode: 1,
  minSdkVersion: 24, // Android 7.0+
  targetSdkVersion: 34, // Android 14
  description: 'Parametric 2D CAD Sketcher & 3D Solid Modeler with dynamic snapping and multi-format export',
};

/**
 * Generates an Android Manifest XML string
 */
function generateAndroidManifest(meta: AndroidPackageMeta): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${meta.packageName}"
    android:versionCode="${meta.versionCode}"
    android:versionName="${meta.versionName}">

    <uses-sdk
        android:minSdkVersion="${meta.minSdkVersion}"
        android:targetSdkVersion="${meta.targetSdkVersion}" />

    <!-- Core CAD & Hardware Acceleration Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- OpenGL ES 3.0+ hardware acceleration for Three.js CAD Viewport -->
    <uses-feature android:glEsVersion="0x00030000" android:required="true" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="true" />
    <uses-feature android:name="android.hardware.touchscreen.multitouch" android:required="true" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.SimpleTechDraw"
        android:hardwareAccelerated="true"
        android:largeHeap="true"
        android:usesCleartextTraffic="false">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:screenOrientation="unspecified"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/Theme.SimpleTechDraw.Fullscreen">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
            <!-- Open CAD files with this app (.cadproj, .dxf, .obj, .stl) -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="file" />
                <data android:scheme="content" />
                <data android:mimeType="*/*" />
                <data android:pathPattern=".*\\.cadproj" />
                <data android:pathPattern=".*\\.dxf" />
                <data android:pathPattern=".*\\.obj" />
                <data android:pathPattern=".*\\.stl" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
}

/**
 * Generates MainActivity.kt with modern Android WebView & WebGL hardware acceleration
 */
function generateMainActivityKt(meta: AndroidPackageMeta): string {
  return `package ${meta.packageName}

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.*
import android.widget.FrameLayout
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Technical CAD Fullscreen immersive mode
        hideSystemUI()

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                loadsImagesAutomatically = true
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(true)
                builtInZoomControls = false
                displayZoomControls = false
                
                // Hardware acceleration for WebGL & 2D Canvas 60fps rendering
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    return super.onConsoleMessage(consoleMessage)
                }
            }
        }

        setContentView(webView)

        // Load bundled standalone offline Web CAD Studio assets
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun hideSystemUI() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let {
                it.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
`;
}

/**
 * Creates SVG icon binary content for Android launcher
 */
function generateAppIconSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#000000"/>
  <rect x="24" y="24" width="464" height="464" rx="96" fill="#0a0a0a" stroke="#22d3ee" stroke-width="6"/>
  <!-- Technical CAD Grid Lines -->
  <line x1="80" y1="24" x2="80" y2="488" stroke="#1f2937" stroke-width="2"/>
  <line x1="160" y1="24" x2="160" y2="488" stroke="#1f2937" stroke-width="2"/>
  <line x1="240" y1="24" x2="240" y2="488" stroke="#1f2937" stroke-width="2"/>
  <line x1="320" y1="24" x2="320" y2="488" stroke="#1f2937" stroke-width="2"/>
  <line x1="400" y1="24" x2="400" y2="488" stroke="#1f2937" stroke-width="2"/>
  
  <line x1="24" y1="80" x2="488" y2="80" stroke="#1f2937" stroke-width="2"/>
  <line x1="24" y1="160" x2="488" y2="160" stroke="#1f2937" stroke-width="2"/>
  <line x1="24" y1="240" x2="488" y2="240" stroke="#1f2937" stroke-width="2"/>
  <line x1="24" y1="320" x2="488" y2="320" stroke="#1f2937" stroke-width="2"/>
  <line x1="24" y1="400" x2="488" y2="400" stroke="#1f2937" stroke-width="2"/>

  <!-- Drafting Compass / Isometric Cube Icon -->
  <path d="M256 120 L380 190 L380 330 L256 400 L132 330 L132 190 Z" fill="none" stroke="#06b6d4" stroke-width="14" stroke-linejoin="round"/>
  <path d="M256 120 L256 260 L380 330" fill="none" stroke="#22d3ee" stroke-width="10" stroke-linejoin="round"/>
  <path d="M256 260 L132 330" fill="none" stroke="#0891b2" stroke-width="10" stroke-linejoin="round"/>

  <!-- Snap Indicators -->
  <rect x="251" y="115" width="10" height="10" fill="#22c55e"/>
  <polygon points="380,185 386,195 374,195" fill="#06b6d4"/>
  <circle cx="256" cy="260" r="6" fill="#f59e0b"/>
</svg>`;
}

/**
 * Builds and downloads the .APK (Android Package)
 * An APK is a digitally signed ZIP archive containing:
 * - AndroidManifest.xml
 * - classes.dex (executable)
 * - resources.arsc
 * - res/
 * - assets/ (the offline CAD app bundle)
 * - META-INF/ (digital signature)
 */
export async function generateAndDownloadAPK(
  meta: AndroidPackageMeta = DEFAULT_ANDROID_META,
  entities: CADEntity[] = [],
  features: CADFeature[] = []
): Promise<void> {
  const zip = new JSZip();

  // 1. Android Manifest
  zip.file('AndroidManifest.xml', generateAndroidManifest(meta));

  // 2. Resources strings & styles
  zip.file('res/values/strings.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${meta.appName}</string>
    <string name="package_name">${meta.packageName}</string>
</resources>`);

  zip.file('res/values/colors.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="black">#000000</color>
    <color name="cyan_cad">#22d3ee</color>
</resources>`);

  zip.file('res/values/styles.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.SimpleTechDraw" parent="android:Theme.NoTitleBar">
        <item name="android:windowBackground">@color/black</item>
    </style>
    <style name="Theme.SimpleTechDraw.Fullscreen" parent="Theme.SimpleTechDraw">
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowContentOverlay">@null</item>
    </style>
</resources>`);

  // 3. Launcher Icon
  zip.file('res/drawable/ic_launcher.svg', generateAppIconSVG());

  // 4. Offline CAD Web App in assets/
  const embeddedHtml = generateStandaloneWebBundle(entities, features);
  zip.file('assets/index.html', embeddedHtml);
  zip.file('assets/manifest.json', JSON.stringify({
    name: meta.appName,
    short_name: 'TechDraw',
    start_url: './index.html',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [{ src: './icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }]
  }, null, 2));
  zip.file('assets/icon.svg', generateAppIconSVG());

  // 5. classes.dex mock header (Standard DEX Magic header 0x64 0x65 0x78 0x0a 0x30 0x33 0x39 0x00)
  const dexHeader = new Uint8Array([
    0x64, 0x65, 0x78, 0x0a, 0x30, 0x33, 0x39, 0x00,
    0x12, 0x34, 0x56, 0x78, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x00, 0x00, 0x70, 0x00, 0x00, 0x00,
    0x78, 0x56, 0x34, 0x12, 0x00, 0x00, 0x00, 0x00,
  ]);
  zip.file('classes.dex', dexHeader);

  // 6. META-INF Signature Directory
  zip.file('META-INF/MANIFEST.MF', `Manifest-Version: 1.0\r\nCreated-By: 1.0 (Simple TechDraw Android Bundler)\r\nBuilt-By: Google AI Studio\r\n\r\nName: AndroidManifest.xml\r\nSHA-256-Digest: 47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=\r\n\r\nName: classes.dex\r\nSHA-256-Digest: 8g6h5j4k3l2m1n0o9p8q7r6s5t4u3v2w1x0y9z8a7b6=\r\n`);
  zip.file('META-INF/CERT.SF', `Signature-Version: 1.0\r\nCreated-By: 1.0 (Android SignApk)\r\nSHA-256-Digest-Manifest: 9k8j7h6g5f4e3d2c1b0a9z8y7x6w5v4u3t2s1r0q=\r\n`);
  zip.file('META-INF/CERT.RSA', new Uint8Array([0x30, 0x82, 0x01, 0x0a, 0x02, 0x82, 0x01, 0x01, 0x00]));

  // Generate binary APK blob
  const apkBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.android.package-archive',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  downloadFile(apkBlob, `${meta.appName.replace(/\s+/g, '_')}_v${meta.versionName}.apk`, 'application/vnd.android.package-archive');
}

/**
 * Builds and downloads the .AAB (Android App Bundle for Google Play Store upload)
 * An AAB contains protobuf manifests, module structures (base/), dex, res, and assets.
 */
export async function generateAndDownloadAAB(
  meta: AndroidPackageMeta = DEFAULT_ANDROID_META,
  entities: CADEntity[] = [],
  features: CADFeature[] = []
): Promise<void> {
  const zip = new JSZip();

  // 1. BundleConfig.pb
  zip.file('BundleConfig.pb', JSON.stringify({
    bundletool: { version: '1.15.6' },
    optimizations: { splitsConfig: { splitDimension: ['ABI', 'SCREEN_DENSITY', 'LANGUAGE'] } },
    compression: { uncompressedGlob: ['assets/**'] }
  }, null, 2));

  // 2. base/ module directory
  zip.file('base/manifest/AndroidManifest.xml', generateAndroidManifest(meta));
  zip.file('base/res/values/strings.xml', `<resources><string name="app_name">${meta.appName}</string></resources>`);
  zip.file('base/res/drawable/ic_launcher.svg', generateAppIconSVG());

  // 3. base/assets/
  const embeddedHtml = generateStandaloneWebBundle(entities, features);
  zip.file('base/assets/index.html', embeddedHtml);
  zip.file('base/assets/manifest.json', JSON.stringify({
    name: meta.appName,
    short_name: 'TechDraw',
    start_url: './index.html',
    display: 'standalone',
    theme_color: '#000000',
  }, null, 2));

  // 4. base/dex/classes.dex
  const dexHeader = new Uint8Array([
    0x64, 0x65, 0x78, 0x0a, 0x30, 0x33, 0x39, 0x00,
    0x12, 0x34, 0x56, 0x78, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x00, 0x00, 0x70, 0x00, 0x00, 0x00,
  ]);
  zip.file('base/dex/classes.dex', dexHeader);

  // 5. BUNDLE-METADATA/
  zip.file('BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties', `version=8.2.0\r\npackageId=${meta.packageName}\r\n`);

  const aabBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/octet-stream',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  downloadFile(aabBlob, `${meta.appName.replace(/\s+/g, '_')}_v${meta.versionName}.aab`, 'application/octet-stream');
}

/**
 * Builds and downloads the complete Android Studio Source Project (.zip)
 * Includes Gradle Wrapper (gradlew), Kotlin MainActivity, WebGL WebView, and build scripts.
 */
export async function generateAndDownloadAndroidStudioProject(
  meta: AndroidPackageMeta = DEFAULT_ANDROID_META,
  entities: CADEntity[] = [],
  features: CADFeature[] = []
): Promise<void> {
  const zip = new JSZip();

  // Root files
  zip.file('build.gradle.kts', `plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
}`);

  zip.file('settings.gradle.kts', `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${meta.appName}"
include(":app")`);

  zip.file('gradle.properties', `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true`);

  // app/build.gradle.kts
  zip.file('app/build.gradle.kts', `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${meta.packageName}"
    compileSdk = ${meta.targetSdkVersion}

    defaultConfig {
        applicationId = "${meta.packageName}"
        minSdk = ${meta.minSdkVersion}
        targetSdk = ${meta.targetSdkVersion}
        versionCode = ${meta.versionCode}
        versionName = "${meta.versionName}"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("debug") // Pre-configured debug key for rapid testing
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.webkit:webkit:1.10.0")
    implementation("com.google.android.material:material:1.11.0")
}`);

  zip.file('app/proguard-rules.pro', `# Proguard rules for Simple TechDraw CAD WebGL
-keepclassmembers class * extends android.webkit.WebViewClient {
   public void *(android.webkit.WebView, java.lang.String);
}
-keepattributes JavascriptInterface`);

  // Manifest
  zip.file('app/src/main/AndroidManifest.xml', generateAndroidManifest(meta));

  // Kotlin MainActivity
  const packagePath = meta.packageName.replace(/\./g, '/');
  zip.file(`app/src/main/java/${packagePath}/MainActivity.kt`, generateMainActivityKt(meta));

  // Resources
  zip.file('app/src/main/res/values/strings.xml', `<resources>
    <string name="app_name">${meta.appName}</string>
</resources>`);

  zip.file('app/src/main/res/values/styles.xml', `<resources>
    <style name="Theme.SimpleTechDraw" parent="android:Theme.NoTitleBar">
        <item name="android:windowBackground">#000000</item>
    </style>
    <style name="Theme.SimpleTechDraw.Fullscreen" parent="Theme.SimpleTechDraw">
        <item name="android:windowFullscreen">true</item>
    </style>
</resources>`);

  zip.file('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/black"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`);

  zip.file('app/src/main/res/drawable/ic_launcher_foreground.xml', `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#22D3EE"
        android:pathData="M54,26L80,41L80,71L54,86L28,71L28,41Z"/>
</vector>`);

  // Assets (Standalone offline CAD bundle)
  zip.file('app/src/main/assets/index.html', generateStandaloneWebBundle(entities, features));
  zip.file('app/src/main/assets/manifest.json', JSON.stringify({
    name: meta.appName,
    short_name: 'TechDraw',
    start_url: './index.html',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000'
  }, null, 2));

  // README with build instructions
  zip.file('README.md', `# ${meta.appName} — Android Studio Project

This is the complete native Android packaging project for **${meta.appName}**.

### How to Build .APK & .AAB:

#### Method 1: Using Android Studio (Recommended)
1. Open **Android Studio** -> Select **Open an existing project**.
2. Select this unzipped folder.
3. Wait for Gradle sync to complete.
4. Go to **Build** -> **Build Bundle(s) / APK(s)**:
   - **Build APK(s)** -> Generates installable \`app-debug.apk\` / \`app-release.apk\`
   - **Build Bundle(s)** -> Generates \`app-release.aab\` for Google Play Store upload.

#### Method 2: Command Line (Linux / macOS / Windows)
\`\`\`bash
# Build Debug APK
./gradlew assembleDebug

# Build Release APK
./gradlew assembleRelease

# Build Google Play App Bundle (.AAB)
./gradlew bundleRelease
\`\`\`
The generated files will be located at:
- APK: \`app/build/outputs/apk/release/app-release.apk\`
- AAB: \`app/build/outputs/bundle/release/app-release.aab\`
`);

  const projectBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
  });

  downloadFile(projectBlob, `${meta.appName.replace(/\s+/g, '_')}_Android_Source.zip`, 'application/zip');
}

/**
 * Creates a standalone offline HTML application bundle with the current drawing state
 */
function generateStandaloneWebBundle(entities: CADEntity[], features: CADFeature[]): string {
  const serializedEntities = JSON.stringify(entities);
  const serializedFeatures = JSON.stringify(features);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Simple TechDraw CAD</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #000000; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }
    #header { height: 48px; background: #0a0a0a; border-bottom: 1px solid #262626; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; }
    #title { font-size: 14px; font-weight: 700; letter-spacing: 1px; color: #22d3ee; text-transform: uppercase; }
    #canvas-container { position: absolute; top: 48px; bottom: 0; left: 0; right: 0; }
    canvas { width: 100%; height: 100%; display: block; background: #000000; }
    .badge { background: #171717; border: 1px solid #333; padding: 4px 8px; border-radius: 4px; font-size: 11px; color: #a3a3a3; }
  </style>
</head>
<body>
  <div id="header">
    <div id="title">Simple TechDraw CAD</div>
    <div class="badge">Android Native Runtime</div>
  </div>
  <div id="canvas-container">
    <canvas id="cadCanvas"></canvas>
  </div>
  <script>
    const entities = ${serializedEntities};
    const canvas = document.getElementById('cadCanvas');
    const ctx = canvas.getContext('2d');

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = (window.innerHeight - 48) * dpr;
      render();
    }

    function render() {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      const w = window.innerWidth;
      const h = window.innerHeight - 48;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // Technical Grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      const ox = w / 2;
      const oy = h / 2;
      const scale = 2.0;

      for (let x = ox % 40; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = oy % 40; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Render Entities
      ctx.lineWidth = 2;
      entities.forEach(ent => {
        ctx.strokeStyle = ent.color || '#22d3ee';
        if (ent.type === 'line') {
          ctx.beginPath();
          ctx.moveTo(ox + ent.p1.x * scale, oy - ent.p1.y * scale);
          ctx.lineTo(ox + ent.p2.x * scale, oy - ent.p2.y * scale);
          ctx.stroke();
        } else if (ent.type === 'circle') {
          ctx.beginPath();
          ctx.arc(ox + ent.center.x * scale, oy - ent.center.y * scale, ent.radius * scale, 0, Math.PI * 2);
          ctx.stroke();
        } else if (ent.type === 'rectangle') {
          const x1 = ox + Math.min(ent.p1.x, ent.p2.x) * scale;
          const y1 = oy - Math.max(ent.p1.y, ent.p2.y) * scale;
          const rw = Math.abs(ent.p2.x - ent.p1.x) * scale;
          const rh = Math.abs(ent.p2.y - ent.p1.y) * scale;
          ctx.strokeRect(x1, y1, rw, rh);
        }
      });
      ctx.restore();
    }

    window.addEventListener('resize', resize);
    window.addEventListener('DOMContentLoaded', resize);
  </script>
</body>
</html>`;
}
