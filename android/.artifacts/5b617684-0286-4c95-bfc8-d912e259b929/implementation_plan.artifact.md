# Change App Icon Implementation Plan

This plan outlines the steps to change the Android app icon using the `@capacitor/assets` tool. This tool will take your high-resolution image and generate all the required sizes and formats for Android, including adaptive icons.

## User Review Required

> [!IMPORTANT]
> I will be installing `@capacitor/assets` as a development dependency in your project to handle the icon generation.

## Proposed Changes

### Project Root

#### [NEW] `assets/icon-only.png` (source)
I will copy your image from the Downloads folder to a new `assets` directory in the project root. This serves as the source for the generation tool.

#### [MODIFY] [package.json](file:///D:/vs code porjects/Habit_Tracker11/package.json)
Add `@capacitor/assets` to `devDependencies`.

### Android Component
The tool will automatically update files in [android/app/src/main/res/](file:///D:/vs code porjects/Habit_Tracker11/android/app/src/main/res/), including:
- All `mipmap` folders (hdpi, mdpi, xhdpi, etc.)
- Adaptive icon XML files.

## Execution Steps

1. **Setup Assets Directory**: Create an `assets` folder at the root.
2. **Copy Icon**: Copy the provided image to `assets/icon-only.png`.
3. **Install Tool**: Run `npm install -D @capacitor/assets`.
4. **Generate Icons**: Run `npx @capacitor/assets generate --android`.
5. **Sync**: Run `npx cap sync android` to ensure the project is updated.

## Verification Plan

### Manual Verification
- I will check the `android/app/src/main/res/mipmap-*` directories to confirm new `.png` files have been generated.
- I will verify the content of `ic_launcher.xml` in `mipmap-anydpi-v26`.
