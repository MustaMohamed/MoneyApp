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

The patch, the flag, `mqa build`'s check that `android/settings.gradle` carries React Native's `includeBuild` block and the `Patched React Native compiles (Android)` job in `.github/workflows/pr-checks.yml`, with its paragraph and the "but one, named below" clause in `CLAUDE.md` § Commands, leave together once React Native sets the paint's face itself, or once `enablePreparedTextLayout` turns on, which stops `ReactTextView` handling `RCTText` and the patch running. A React Native bump leaves `react-native+0.86.3.patch` behind, and `__tests__/app_config_plugins.test.ts` goes red until the patch is regenerated under the new version with `npx patch-package react-native --include 'ReactAndroid/src/main/java/com/facebook/react/views/text/ReactTextView\.java'`. Without `--include`, a run after a from-source build diffs `ReactAndroid/build` and `.cxx` into the patch. `patch-package` applies the patch at `postinstall`, so a checkout whose `node_modules` predates it needs `npm ci`.

## 6. Limits

The reserve is measured at the paint's size, which is the outer text's size. A nested run larger than its outer text, and OS-scaled text above font scale 1.0, still overrun it, and both stay with ADR `2026-09-27-transactions-search-tally.md` §7. A text with a character outside every `CustomStyleSpan`, or a run whose span has no font family, keeps the constructed face (§2), so its reserve is still Roboto's `…`.

## 7. The three cut reads of PR #716 came from an APK without the patch

PR #716's render pass (MA-163, #682) read three truncated lines with the last dot cut, on `Pixel_2_API_34_3` with `build: REUSE`. MA-178 (#718) read them again on 2026-10-14, in this order.

- **The device.** Slot 3, `Pixel_2_API_34_3`, `emulator-5558`, held with `mqa claim 3` over a stale row from MA-186's removed worktree.
- **The APK found on slot 3, before any build.** File time 2026-09-15 02:38:12 +0300, read as `apk_time` reads it (`pm path`, then `stat -c %Y` on that path). `unzip -p <the pulled apk> 'classes*.dex' | grep -a -c <name>` prints 0 for `mConstructedTypeface`, the field the patch has held since MA-141's probe build, and 0 for `mEllipsisProbe`, the field the merged patch added. It prints 1 for React Native's own `mShouldAdjustSpannableFontSize`, so the read finds field names in this dex.
- **The other two slots,** read by the `/prep` conductor on 2026-10-13 and 2026-10-14. Slot 1's APK, file time 2026-10-03 21:34, prints 1 for `mConstructedTypeface` and 0 for `mEllipsisProbe`: MA-141's probe build, a patched APK from before `mEllipsisProbe` existed. Slot 2's, file time 2026-10-07 14:46, prints 1 for both.
- **The APK built here.** Built on the branch at a commit whose native surface is `origin/main`'s at `b005195b`: `npx expo prebuild --platform android`, `mqa build` (5m 5s), `mqa install`. Both counts print 1 on `android/app/build/outputs/apk/debug/app-debug.apk` before the install, and on the APK pulled from the device after it. The first `mqa install` failed with `Broken pipe (32)` from the device's package service and left the old APK in place; the second installed it at 2026-10-14 17:01:29 +0300. `mqa up` printed `build: REUSE` before the build and after it.
- **The walk.** The four rows of `.claude/skills/emulator-verify/features/` that read these lines, `transaction_form.md` `edit strip ellipsis, typeface`, `accounts_list.md` `list walk, large font`, `transactions.md` `row ellipsis, typeface` and `dashboard.md` `account card ellipsis, typeface`, at 1.0 and 2.0 (the accounts list at 2.0, as its row names). After the install the slot's system process stopped responding until an `adb reboot`, and agent-device's snapshot helper kept crashing on it, so the walk ran under `MQA_UI=uiautomator`. Shots and walk files are in `~/.ship/MoneyApp/MA-178/findings/render/`.

Px clear is the background between the third dot and the text box's right bound from `mqa bounds`, on the full shot at 2.625 px per dp; for a right-aligned value it is the background between the box's left bound and the first glyph.

| Line | Scale | Box, dp | Drawn | Px clear |
|---|---|---|---|---|
| Acceptance 2: the edit strip's locked `Payoneer Dollars` chip | 2.0 | 46.1 by 30.10 | `P…` | 35 |
| Acceptance 3: the archived caption `Bank · 4,820 EGP` | 2.0 | 82.3 by 30.10 | `Bank …`, no `·` | 11 |
| Acceptance 4: the edit strip's dimmed `CIB Current Account` chip | 1.0 | 67.4 by 15.24 | `CIB Curre…` | 12 |
| The transaction row's five long titles | 1.0 | 124.2 to 224.4 by 21.33 | each ends `…` | 10 to 21 |
| Every transaction row title | 2.0 | 123.0 to 181.0 by 42.29 | each ends `…` | 6 to 49 |
| `Budget assigned` label, `Commitment` badge label | 2.0 | 32.4 by 25.14, 19.8 by 26.29 | `B…`, `…` | 6, 5 |
| Home account card names | 1.0 | 157.3 to 157.7 by 23.24 | each ends `…` | 14, 38, 19 |
| Home account card names | 2.0 | 135.2 to 135.6 by 47.24 | each ends `…` | 28, 5, 39 |
| Home account card `Month In`, right-aligned, truncated | 1.0 | 147.0 by 16.38 | first glyph whole | 4, 15, 6 |

Every other chip label on both edit sheets reads three whole dots at both scales, 5 to 36 px clear, and every other name and caption on the accounts list at 2.0, 8 to 56 px clear. At 1.0 the row's label and badge print whole, and at 2.0 the three `Month In` boxes read 96.0, 101.3 and 95.6 dp, the widths MA-140 recorded for the values drawn whole and shrunk. The `/prep` probe read the first three rows on slot 2's APK on 2026-10-14 with the same kept characters, 35, 11 and 13 px for Acceptance lines 2 to 4 and 11 to 22 px for the long titles at 1.0; the 1 px between the two reads is this read's box bound, rounded down to a whole pixel.

**Verdict: whole.** Each line of Acceptance lines 2 to 4 shows three whole dots on an APK built with the patch, and every line MA-141 fixed reads as it did on MA-141's own shots.

**Cause, read.** The APK PR #716 read held no build of the patch: slot 3's APK was installed on 2026-09-15, before `/prep` 634 began on 2026-10-03 20:43, and its dex holds neither field. `build_verdict` printed `REUSE` because PR #716's branch had no native-surface change against `origin/main`, and it read the APK's install time only when the branch had one. The patch does not change.

**The build verdict.** The rule that now reads `REBUILD` for an APK older than the native history a branch holds is ADR [2026-10-14-build-verdict-reads-base-history.md](2026-10-14-build-verdict-reads-base-history.md).
