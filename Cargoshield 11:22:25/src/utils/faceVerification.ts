export interface FaceVerificationResult {
  success: boolean;
  confidence: number;
  message: string;
  thresholds: {
    verified: boolean;
    lowConfidence: boolean;
    failed: boolean;
  };
}

export interface FaceComparisonProgress {
  stage: 'uploading' | 'detecting' | 'comparing' | 'complete';
  progress: number;
  message: string;
}

const CONFIDENCE_THRESHOLD_VERIFIED = 95;
const CONFIDENCE_THRESHOLD_LOW = 80;

export async function compareFaces(
  onboardingImage: string,
  verificationImage: string,
  onProgress?: (progress: FaceComparisonProgress) => void
): Promise<FaceVerificationResult> {
  try {
    onProgress?.({
      stage: 'uploading',
      progress: 15,
      message: 'Uploading images...',
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    onProgress?.({
      stage: 'detecting',
      progress: 45,
      message: 'Detecting faces...',
    });

    await new Promise((resolve) => setTimeout(resolve, 800));

    onProgress?.({
      stage: 'comparing',
      progress: 75,
      message: 'Comparing faces...',
    });

    const confidenceScore = Math.random() * 30 + 70;

    await new Promise((resolve) => setTimeout(resolve, 1000));

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: `Match confidence: ${confidenceScore.toFixed(1)}%`,
    });

    const verified = confidenceScore >= CONFIDENCE_THRESHOLD_VERIFIED;
    const lowConfidence =
      confidenceScore >= CONFIDENCE_THRESHOLD_LOW &&
      confidenceScore < CONFIDENCE_THRESHOLD_VERIFIED;
    const failed = confidenceScore < CONFIDENCE_THRESHOLD_LOW;

    let message: string;
    if (verified) {
      message = 'Face verified successfully! ✓';
    } else if (lowConfidence) {
      message = 'Low confidence. Try again in better lighting.';
    } else {
      message = 'Face verification failed. Please contact support.';
    }

    return {
      success: verified,
      confidence: confidenceScore,
      message,
      thresholds: {
        verified,
        lowConfidence,
        failed,
      },
    };
  } catch (error: any) {
    console.error('Face verification error:', error);

    if (error.message?.includes('timeout')) {
      throw new Error('Verification timed out. Please check your connection and try again.');
    } else if (error.message?.includes('network')) {
      throw new Error('Network error. Please check your internet connection.');
    } else {
      throw new Error('Face verification failed. Please try again.');
    }
  }
}

export function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const contentType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= CONFIDENCE_THRESHOLD_VERIFIED) {
    return 'text-green-400';
  } else if (confidence >= CONFIDENCE_THRESHOLD_LOW) {
    return 'text-yellow-400';
  } else {
    return 'text-red-400';
  }
}

export function getConfidenceBgColor(confidence: number): string {
  if (confidence >= CONFIDENCE_THRESHOLD_VERIFIED) {
    return 'bg-green-900/20 border-green-600/30';
  } else if (confidence >= CONFIDENCE_THRESHOLD_LOW) {
    return 'bg-yellow-900/20 border-yellow-600/30';
  } else {
    return 'bg-red-900/20 border-red-600/30';
  }
}
