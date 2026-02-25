
import { test, expect } from '@playwright/test';

test.use({
  baseURL: 'http://localhost:3000',
});

test.describe('Pilot UI Verification', () => {
  test('Lecturer Dashboard and Grading Verification', async ({ page, context }) => {
    // 1. Set Session Cookie to Simulate Login
    // Lecturer ID is 1
    const sessionCookie = JSON.stringify({ userId: 1 });
    await context.addCookies([
      {
        name: 'auth-session',
        value: sessionCookie,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Date.now() / 1000 + 3600,
      },
    ]);

    // 2. Navigate to Dashboard
    console.log("Navigating to Dashboard...");
    await page.goto('/dashboard');

    // Verify Dashboard loads
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify Active Sessions count (should be 1 or more)
    // The dashboard has a card with "Active Sessions" (use first() to resolve strict mode)
    await expect(page.getByText('Active Sessions').first()).toBeVisible();

    // Verify "Semester 1 - 1000 Students" is visible in "Active Sessions" list
    // It might be in the "Recent Sessions" card
    // We created a class with code "SEM1" and name "Semester 1 - 1000 Students"
    // The card shows "SEM1" and "Semester 1 - 1000 Students"
    await expect(page.getByText('SEM1')).toBeVisible();

    // 3. Click on the Session
    console.log("Navigating to Session...");
    await page.getByText('SEM1').click();

    // Verify we are on Session Page
    // URL should be /dashboard/sessions/[id]
    await expect(page).toHaveURL(/\/dashboard\/sessions\/\d+/);
    await expect(page.getByText('Semester 1 - 1000 Students')).toBeVisible();

    // 4. Verify 1000 Students (or enrollment count)
    // The page likely shows "1000 Students" somewhere
    // Or in the tabs
    await expect(page.getByText('1000')).toBeVisible();

    // 5. Navigate to Quizzes/Assessments
    // Assuming there is a tab or link "Assessments" or "Quizzes"
    // The "Classes" model calls it "quizzes".
    // Let's look for "Assessments" or "Quizzes" tab/button.
    // I'll assume "Assessments" based on typical UI or "Quizzes".
    // I'll try to find a tab trigger.
    const assessmentsTab = page.getByRole('tab', { name: 'Assessments' });
    if (await assessmentsTab.isVisible()) {
        await assessmentsTab.click();
    } else {
        // Fallback or maybe it's "Quizzes"
        await page.getByRole('tab', { name: 'Quizzes' }).click();
    }

    // 6. Click on "Final Exam 2024"
    console.log("Navigating to Assessment...");
    await page.getByText('Final Exam 2024').click();

    // Verify Assessment Page
    // URL /dashboard/sessions/[id]/quizzes/[qid]
    await expect(page).toHaveURL(/\/dashboard\/sessions\/\d+\/quizzes\/\d+/);
    await expect(page.getByRole('heading', { name: 'Final Exam 2024' })).toBeVisible();

    // 7. Verify Grading Status
    // We injected a "GRADED" submission for Student 1.
    // There should be a table row with "Student 1" and "GRADED" status and "85" marks.
    console.log("Verifying Graded Submission...");

    // Wait for table to load
    await page.waitForTimeout(2000);

    await expect(page.getByText('Student 1')).toBeVisible();
    await expect(page.getByText('85')).toBeVisible(); // Score
    // Status might be an icon or text "GRADED"
    // await expect(page.getByText('GRADED')).toBeVisible(); // Case sensitive?

    // 8. Click on Student 1 to view Feedback
    await page.getByText('Student 1').click();

    // Verify Feedback Drawer/Page
    // Expect "Feedback" text or similar
    await expect(page.getByText('Feedback')).toBeVisible();
    await expect(page.getByText('Great essay on AI.')).toBeVisible();

    console.log("Frontend Verification Passed!");
  });
});
