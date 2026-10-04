# ADR: A truncated Android line reserves its ellipsis in the face it draws in

- **Date:** 2026-10-03
- **Status:** accepted
- **Ticket:** MA-141 (#634), under #602
- **Applies to:** `patches/react-native+0.86.3.patch`, `app.json`

On Android a truncated line in Inter or Sora could draw its `…` wider than the space Android reserved for it, so the last dot was cut, or on a right-aligned line the first glyph. This record fixes it once, below every text, with a patch on React Native's text view and a build setting that puts the patch in every APK. Line cites in React Native files are to the unpatched 0.86.3 sources.

## 1. The mechanism

`enablePreparedTextLayout()` defaults to false (`ReactNativeFeatureFlagsDefaults.kt:110`), so `ReactTextView` draws with its own `StaticLayout` at the view's final width (`ReactTextView.java:187-215`). Android 34 reserves a truncated line's ellipsis as `paint.measureText` of the ellipsis string, using the TextView's own paint (`StaticLayout.java:1189`). React Native sets that paint's size (`ReactTextViewManager.kt:269-272`, `ReactTextView.java:392-397`, `:569`) and never its typeface, so the reserve is Roboto's `…`, 0.669 em. The glyph is drawn in the line's face: Inter Regular 0.864 em, Medium 0.910, SemiBold 0.956, Bold 1.002. When the space left after the last whole character is under that shortfall, `TextView.java:9019-9031` clips at the padding box. Padding and `overflow` sit inside that clip, so no JS style fixes it.

## 2. The paint takes the face its text draws in

`setText(ReactTextUpdate)` sets the paint's typeface through `setTypeface` before `setText(spanned)`, on every call. `TextView.setTypeface` drops the old layout when the face changes. The face is one of two values.

- When `CustomStyleSpan`s with a non-null `fontFamily` cover every character, no run reads the paint's face (`CustomStyleSpan.kt:70-71`, `ReactTypefaceUtils.kt:107-111`). The face is the one `CustomStyleSpan.updateMeasureState` leaves on a copy of the view's paint. With two or more faces among the spans, it is the face whose `…` measures widest at the paint's size, so the reserve is never narrower than the drawn `…`.
- Otherwise the face is the one the view was constructed with, which is today's paint. That covers empty text, a character outside every `CustomStyleSpan`, and a span with a null `fontFamily`. A recycled view needs the reset: text view recycling is on (`ReactNativeFeatureFlagsDefaults.kt:126`) and `recycleView` (`ReactTextView.java:101-154`) leaves the face alone.

The constructed face is null on a theme whose paint starts with none, and `TextView.setTypeface(null)` takes the default face, so nothing dereferences it. The patch adds two fields, the constructed face and a reused measuring paint, one private method and one call to `ReactTextView.java`, and changes no other file. Its types are fully qualified, so the import block is untouched.

## 3. Android compiles React Native from source

The app consumes ReactAndroid as the prebuilt artifact `com.facebook.react:react-android:0.86.3`, so a Java patch reaches an APK only when React Native's Android library compiles from the patched source. `app.json` sets `buildReactNativeFromSource: true` inside the `expo-build-properties` entry's `android` object. There it wins over a top-level key (`expo-build-properties/build/pluginConfig.js:37-39`), and prebuild appends `includeBuild(expoAutolinking.reactNative)` to `settings.gradle` (`build/android.js:267-296`). The patch changes Android source only, so there is no top-level and no `ios` key, and iOS keeps the prebuilt React Native.

Every clean Android build, local and EAS, now compiles React Native. The MA-141 probe's single-ABI debug build took 6m 7s, raised the 1-minute load from 3.40 to 85.49 and used about 7 GiB of disk. On a clean tree it also fetches the boost, double-conversion, folly, fast_float, fmt and glog archives (`ReactAndroid/build.gradle.kts:302-433`, into `REACT_NATIVE_DOWNLOADS_DIR` when set, `:33-38`), plus Hermes and CMake, and a failed fetch fails the build; it is retried, not fixed in code, as was the GitHub 404 on glog that stopped one MA-141 build. The included build reads the SDK path from `ANDROID_HOME` or `ANDROID_SDK_ROOT` (`ReactAndroid/hermes-engine/build.gradle.kts:28-33`) and fails with `local.properties` alone. `mqa build` exports `ANDROID_HOME` as `$HOME/Library/Android/sdk` when the shell sets neither.

## 4. Routes not taken

The 2026-10-03 decision on the ticket weighed two other routes. Flipping `enablePreparedTextLayout` through a config plugin moves every `RCTText` to `PreparedLayoutTextViewManager` (`MainReactPackage.kt:155-156`), a different text pipeline for every text in the app. A local view manager replacing `RCTText` puts a copy of React Native's text view manager into the app as native code it owns across every React Native bump. The patch changes one method's input and nothing else.

## 5. Removal

The patch and the flag leave together once React Native sets the paint's face itself, or once `enablePreparedTextLayout` turns on, which stops `ReactTextView` handling `RCTText` and the patch running. A React Native bump leaves `react-native+0.86.3.patch` behind, and `__tests__/app_config_plugins.test.ts` goes red until the patch is regenerated under the new version with `npx patch-package react-native --include 'ReactAndroid/src/main/java/com/facebook/react/views/text/ReactTextView\.java'`. Without `--include`, a run after a from-source build diffs `ReactAndroid/build` and `.cxx` into the patch. `patch-package` applies the patch at `postinstall`, so a checkout whose `node_modules` predates it needs `npm ci`.

## 6. Limits

The reserve is measured at the paint's size, which is the outer text's size. A nested run larger than its outer text, and OS-scaled text above font scale 1.0, still overrun it, and both stay with ADR `2026-09-27-transactions-search-tally.md` §7. A text with a character outside every `CustomStyleSpan`, or a run whose span has no font family, keeps the constructed face (§2), so its reserve is still Roboto's `…`.
