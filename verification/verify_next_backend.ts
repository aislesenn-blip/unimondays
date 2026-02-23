import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000";

async function verify() {
    console.log("Verifying API Routes...");
    try {
        const res = await fetch(`${BASE_URL}/api/results`);
        if (res.ok) {
            console.log("✅ GET /api/results: Success");
        } else {
            console.error("❌ GET /api/results: Failed", res.status);
        }
    } catch (e) {
        console.error("❌ GET /api/results: Error", e);
    }
}

verify();
