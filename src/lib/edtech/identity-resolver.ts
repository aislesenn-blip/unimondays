export function resolveIdentity(sub: any) {
    return {
        key: sub.student?.id || sub.id,
        primaryName: sub.student?.fullName || "Unknown Student",
        secondaryInfo: sub.student?.email || "",
        regNo: ""
    }
}

export function upgradeIdentity(student: any, identity: any) {
    if (!student.primaryName || student.primaryName === "Unknown Student") {
        student.primaryName = identity.primaryName;
    }
    if (!student.secondaryInfo) {
        student.secondaryInfo = identity.secondaryInfo;
    }
}
