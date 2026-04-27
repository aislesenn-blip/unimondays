All three UI changes are perfectly in place right now:
1. `CreateWorkSessionSheet.tsx` has the JSON edit rubric and no AI persona.
2. `DashboardSidebar.tsx` has no avatar/meter.
3. `SubmissionDrawer.tsx` (the student one) is perfectly simple and doesn't expose the OCR to the student.
Wait, let me make sure the user didn't mean they want `DashboardSidebar.tsx` to have a class code copy button. I added it to `page.tsx`.

Let me run tests / typecheck and push!
