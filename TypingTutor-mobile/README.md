# Pa-O Typing Tutor for Android

A native Kotlin / Jetpack Compose app for Android 7.0 (API 24) and newer.

## Included

- Home dashboard, eight sequential English lessons from the web curriculum,
  free practice, and 30 / 60 / 120 second English tests.
- English, numbers, code, and Pa-O direct-key drills. The built-in Pa-O pad uses
  the same basic key mapping as `frontend/src/components/keyboardLayouts.ts`.
  This is a key-output drill, not a translated language curriculum or an IME.
- Live passage highlighting, WPM and attempt accuracy, retry, and lesson passes
  at 95% accuracy. Timers start with the first committed input.
- The latest 100 completed results, permanent lesson passes, and a theme
  preference saved on the device. Resetting progress requires confirmation.
- An in-progress attempt survives activity recreation / rotation through a
  ViewModel. Unfinished attempts do not survive process death and are not saved.

The app has no hosted authentication, cloud synchronization, leaderboard,
admin tools, adaptive recommendation engine, or network dependency. It is a
native offline starting point, not full feature parity with `frontend`.

## Build

The checked-in wrapper pins Gradle 9.6.0 with its SHA-256. The daemon requires
Java 25. Android Gradle Plugin 9.4.1 uses SDK platform 37.0 and build-tools 36.0.0.
Android Studio can install these tools, then run the `app` configuration.

```sh
cd TypingTutor-mobile
bash gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug --max-workers=2
```

The installable debug APK is `app/build/outputs/apk/debug/app-debug.apk`.
It uses a local debug signing key. Configure your own release signing before
publishing; no release credentials are included.

In this cloud workspace, the toolchain is installed outside the checkout:

```sh
export JAVA_HOME=/workspace/.jdks/jdk-25.0.4.1
export ANDROID_HOME=/workspace/.android-sdk
export ANDROID_USER_HOME=/workspace/.android-user
export GRADLE_USER_HOME=/workspace/.gradle
bash gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug \
  --no-daemon --max-workers=2 --console=plain \
  -Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts
```

The cloud Gradle user configuration supplies the platform proxy. The system
Java trust store preserves TLS verification through that proxy.

## Scoring and input

WPM is correctly matched Unicode code points divided by five per minute, not
graphemes or Pa-O words. Accuracy is correct insertions divided by all insertions;
backspace never erases an incorrect attempt. Composing IME input is scored only
after commitment. Fixed drills require an exact match. Timed tests finish at
their deadline, even if the UI resumes after that time.

Device keyboard, physical keyboard, and paste input are supported. These are
personal practice scores; paste is not blocked and they are not suitable as
verified competitive scores. No attempt text is stored in completed history.

## Validation

`TypingEngineTest` covers corrected mistakes, deletion and middle edits,
Unicode, target limits, deadline behavior, timed versus fixed completion,
lesson thresholds, and Pa-O key coverage. `lintDebug` checks Android API
compatibility and app resources. Instrumented tests require a connected Android
device or emulator:

```sh
bash gradlew :app:connectedDebugAndroidTest
```

Validated in the cloud workspace: debug APK build and signature verification,
11 unit tests, Android lint with no errors, and two UI tests on an API 29
software emulator. UI tests cover lesson completion and unlocking, activity
recreation and storage reload in a fresh activity, and Pa-O pad insertion,
backspace, space, and leave confirmation. Physical-device testing and release
signing remain separate steps.
