# DIN Scanner Example

Runnable React Native app for continuous OCR of 8-digit DIN values and coverage lookup.

## Data

Convert the CSV source into the bundled JSON file with:

```bash
npm run convert:data
```

This writes `src/data/planw.generated.json`.

## Install

```bash
npm install
```

For iOS:

```bash
bundle install
bundle exec pod install --project-directory=ios
```

## Run

Start Metro:

```bash
npm start
```

In another terminal:

```bash
npm run android
```

or:

```bash
npm run ios
```

## Continuous OCR flow

- `react-native-vision-camera` provides the live camera preview.
- `vision-camera-ocr` scans text from each frame.
- The app extracts exact 8-digit DIN values with `(?<!\d)\d{8}(?!\d)`.
- A DIN must appear in 2 consecutive frames before it is accepted.
- The accepted DIN is looked up in `src/data/planw.generated.json`.

## Notes

- DINs are compared as strings so leading zeroes are preserved.
- Testing the camera flow is best on a real device.
