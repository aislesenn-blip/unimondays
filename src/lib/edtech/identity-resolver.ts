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

  // Deterministic Key Routing: If mapped to a real user or a firm regNo, use it.
  // Otherwise, it remains a solitary ghost script.
  const key = userId || sub.studentRegNo || regNo || `ghost-${sub.id}`;

  const detectedName = sub.score?.detectedIdentity;
  const validDetectedName = detectedName && detectedName !== 'UNIDENTIFIED_IDENTITY' ? detectedName : null;

  // Identity Fusion Hierarchy:
  // 1. Registered User Name (Absolute Ground Truth)
  // 2. Explicitly Assigned Student Name (via UI Override or initial creation)
  // 3. AI Detected Name (Cloud Marking Extraction)
  // 4. Ghost Placeholder
  const primaryName = sub.user?.fullName
    || sub.studentName
    || validDetectedName
    || `Unidentified Script (${sub.id?.substring(0, 6) || 'Unknown'})`;

  // Provide as much secondary context as possible
  const secondaryInfo = sub.studentRegNo || sub.user?.email || validDetectedName || regNo || 'N/A';

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
  // If the existing name is a placeholder and the new name is real, upgrade it.
  if (existing.primaryName.startsWith('Unidentified') && !newIdentity.primaryName.startsWith('Unidentified')) {
    existing.primaryName = newIdentity.primaryName;
  }

  // Cross-pollination of identity info
  if ((existing.secondaryInfo === 'N/A' || !existing.secondaryInfo) && newIdentity.secondaryInfo !== 'N/A') {
    existing.secondaryInfo = newIdentity.secondaryInfo;
  }

  // If a ghost script is suddenly mapped to a User ID or Reg No, it sheds its ghost status.
  if (existing.isGhost && !newIdentity.isGhost) {
      existing.isGhost = false;
      existing.userId = newIdentity.userId;
      existing.regNo = newIdentity.regNo;

      // Upgrade Key mapping
      existing.key = newIdentity.key;
  }
}
