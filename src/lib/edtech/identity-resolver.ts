export interface StudentIdentity {
  key: string;
  primaryName: string;
  secondaryInfo: string;
  isGhost: boolean;
  userId: string | null;
  regNo: string | null;
}

/**
 * World-Class Identity Resolver
 *
 * Deterministically resolves a student's identity from a generic Submission object.
 * Priority Logic:
 * 1. Registered User ID (Absolute Truth)
 * 2. Explicit Student RegNo (Admin Override / Profile)
 * 3. AI Detected Name/ID (Extraction)
 * 4. Submission ID (Ghost Fallback for Unidentified Cloud Scripts)
 */
export function resolveIdentity(sub: any): StudentIdentity {
  const userId = sub.userId || null;
  let regNo = sub.studentRegNo || sub.score?.detectedIdentity || sub.user?.email || null;

  if (regNo === 'UNIDENTIFIED_IDENTITY' || regNo === 'UNIDENTIFIED') {
    regNo = null;
  }

  const isGhost = !userId && !regNo;
  const key = userId || regNo || `ghost-${sub.id}`;

  const detectedName = sub.score?.detectedIdentity;
  const validDetectedName = detectedName && detectedName !== 'UNIDENTIFIED_IDENTITY' ? detectedName : null;

  const primaryName = validDetectedName
    || sub.user?.fullName
    || sub.studentName
    || `Unidentified Script (${sub.id?.substring(0, 6) || 'Unknown'})`;

  const secondaryInfo = sub.studentRegNo || sub.user?.email || regNo || 'N/A';

  return {
    key,
    primaryName,
    secondaryInfo,
    isGhost,
    userId,
    regNo
  };
}

/**
 * Intelligent Merger
 * Updates an existing mapped student if a new submission provides higher-fidelity identity data.
 */
export function upgradeIdentity(existing: any, newIdentity: StudentIdentity) {
  if (existing.primaryName.startsWith('Unidentified') && !newIdentity.primaryName.startsWith('Unidentified')) {
    existing.primaryName = newIdentity.primaryName;
  }
  if ((existing.secondaryInfo === 'N/A' || !existing.secondaryInfo) && newIdentity.secondaryInfo !== 'N/A') {
    existing.secondaryInfo = newIdentity.secondaryInfo;
  }
}
