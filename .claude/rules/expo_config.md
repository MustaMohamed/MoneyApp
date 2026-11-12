---
paths:
  - "app.json"
  - "package.json"
---

# Expo config rules

`expo install --fix` keeps adding `@react-native-community/datetimepicker` to `app.json` `plugins`; take it back out. With no options the plugin is a no-op, and its undeclared `@expo/config-plugins` require crashed `expo prebuild` until #195 flattened the lockfile, so nothing warns now when it is listed. The `expo-image` and `expo-status-bar` plugins `--fix` adds beside it are fine to keep. Always diff `app.json` after `expo install --fix`.
