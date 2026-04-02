import React, { useCallback, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { useTextRecognition } from 'react-native-vision-camera-ocr-plus';
import {
  extractDinCandidates,
  lookupDin,
  normalizeOcrText,
  type CoverageRow,
} from './src/dinCoverage';

type ScanResult =
  | { status: 'idle' }
  | { status: 'not_covered'; din: string }
  | { status: 'covered'; din: string; drug: CoverageRow };

const REQUIRED_CONFIRMATIONS = 2;

export default function App() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const hitCountsRef = useRef<Record<string, number>>({});
  const lastCommittedDinRef = useRef<string | null>(null);

  const [ocrText, setOcrText] = useState('');
  const [result, setResult] = useState<ScanResult>({ status: 'idle' });

  const applyDetectedText = useCallback((rawText: string) => {
    const text = normalizeOcrText(rawText);
    if (!text) {
      return;
    }

    setOcrText(text);

    const candidates = extractDinCandidates(text);
    if (candidates.length === 0) {
      return;
    }

    const din = candidates[0];
    const nextCount = (hitCountsRef.current[din] ?? 0) + 1;
    hitCountsRef.current = { [din]: nextCount };

    if (nextCount < REQUIRED_CONFIRMATIONS || lastCommittedDinRef.current === din) {
      return;
    }

    lastCommittedDinRef.current = din;
    const drug = lookupDin(din);

    if (drug) {
      setResult({ status: 'covered', din, drug });
      return;
    }

    setResult({ status: 'not_covered', din });
  }, []);

  const { scanText } = useTextRecognition({ language: 'latin' });

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';

      const scanned = scanText(frame);
      const text = scanned?.result?.text ?? '';
      if (!text) {
        return;
      }

      runOnJS(applyDetectedText)(text);
    },
    [applyDetectedText, scanText],
  );

  const statusText = useMemo(() => {
    if (!hasPermission) {
      return 'Camera permission required';
    }

    if (!device) {
      return 'Back camera unavailable';
    }

    switch (result.status) {
      case 'covered':
        return `Covered: ${result.drug.brandName}`;
      case 'not_covered':
        return `Not covered: ${result.din}`;
      default:
        return 'Scan a DIN';
    }
  }, [device, hasPermission, result]);

  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.cameraShell}>
        {device && hasPermission ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            frameProcessor={frameProcessor}
            pixelFormat="yuv"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>{statusText}</Text>
          </View>
        )}

        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.scanBox} />
          <Text style={styles.overlayText}>Point the DIN inside the box</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.status}>{statusText}</Text>

        {result.status === 'covered' ? (
          <View style={styles.card}>
            <Text style={styles.label}>DIN</Text>
            <Text style={styles.value}>{result.din}</Text>
            <Text style={styles.label}>Drug</Text>
            <Text style={styles.value}>{result.drug.brandName}</Text>
            <Text style={styles.meta}>{result.drug.chemicalName}</Text>
            <Text style={styles.meta}>
              {result.drug.strength} • {result.drug.dosageForm}
            </Text>
            <Text style={styles.meta}>{result.drug.manufacturer}</Text>
          </View>
        ) : null}

        {result.status === 'not_covered' ? (
          <View style={styles.card}>
            <Text style={styles.label}>DIN</Text>
            <Text style={styles.value}>{result.din}</Text>
            <Text style={styles.notCovered}>Not covered</Text>
          </View>
        ) : null}

        <Text numberOfLines={3} style={styles.preview}>
          OCR: {ocrText || '-'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  cameraShell: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#152238',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderText: {
    color: '#dce7f7',
    fontSize: 18,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBox: {
    width: '78%',
    height: 140,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#82f7c5',
    backgroundColor: 'rgba(130, 247, 197, 0.08)',
  },
  overlayText: {
    marginTop: 16,
    color: '#f3f7ff',
    fontSize: 16,
    fontWeight: '600',
  },
  panel: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  status: {
    color: '#f3f7ff',
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#112034',
    padding: 16,
    gap: 6,
  },
  label: {
    color: '#8ca0bf',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    color: '#d1dced',
    fontSize: 14,
  },
  notCovered: {
    color: '#ff8b8b',
    fontSize: 16,
    fontWeight: '700',
  },
  preview: {
    color: '#8ca0bf',
    fontSize: 13,
  },
});
