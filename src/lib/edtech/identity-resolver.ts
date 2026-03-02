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
  // Prioritize the explicitly set registration number.
  let regNo = sub.studentRegNo || sub.user?.email || null;

  const detectedIdentity = sub.score?.detectedIdentity;
  const validDetectedIdentity = detectedIdentity && !['UNIDENTIFIED_IDENTITY', 'UNIDENTIFIED'].includes(detectedIdentity) ? detectedIdentity : null;

  // If no firm regNo, consider the AI-detected one.
  if (!regNo && validDetectedIdentity && /^\d/.test(validDetectedIdentity)) { // Simple check if it looks like a reg number
    regNo = validDetectedIdentity;
  }

  const isGhost = !userId && !regNo;

  // **CRITICAL FIX**: The key must be stable. It CANNOT be based on a detected name.
  // It must be based on a permanent, unique identifier.
  const key = userId || regNo || `ghost-${sub.id}`;

  // Identity Fusion Hierarchy for DISPLAY NAME:
  // 1. Registered User Name (Absolute Ground Truth)
  // 2. Explicitly Assigned Student Name (via UI Override or initial creation)
  // 3. AI Detected Name (Cloud Marking Extraction)
  // 4. Ghost Placeholder
  const primaryName = sub.user?.fullName
    || sub.studentName
    || validDetectedIdentity // Use the valid detected identity for display
    || `Unidentified Script (${sub.id?.substring(0, 6) || 'Unknown'})`;

  // Provide as much secondary context as possible
  const secondaryInfo = sub.studentRegNo || sub.user?.email || validDetectedIdentity || 'N/A';

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
 * Intelligent Merger (Identity Fusion)
 * Seamlessly merges a 'Ghost Script' (Cloud Marking AI output) with a 'Mapped Student' (Real User).
 * It dynamically upgrades fidelity without overwriting absolute ground truths.
 */
export function upgradeIdentity(existing: any, newIdentity: StudentIdentity) {
  // Upgrade the display name if the new one is of higher quality (i.e., not a placeholder)
  const isExistingPlaceholder = existing.primaryName.startsWith('Unidentified');
  const isNewNameReal = !newIdentity.primaryName.startsWith('Unidentified');
  if (isExistingPlaceholder && isNewNameReal) {
    existing.primaryName = newIdentity.primaryName;
  }

  // If the existing secondary info is weak, upgrade it.
  if ((existing.secondaryInfo === 'N/A' || !existing.secondaryInfo) && newIdentity.secondaryInfo !== 'N/A') {
    existing.secondaryInfo = newIdentity.secondaryInfo;
  }

  // If a ghost script is suddenly mapped to a User ID or Reg No, it sheds its ghost status.
  if (existing.isGhost && !newIdentity.isGhost) {
      existing.isGhost = false;
      existing.userId = newIdentity.userId;
      existing.regNo = newIdentity.regNo;

      // **CRITICAL FIX**: The key MUST be upgraded to reflect the new, stable identity.
      existing.key = newIdentity.key;
  }
}
