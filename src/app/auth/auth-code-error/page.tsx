
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AuthCodeError() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Authentication Error</CardTitle>
                    <CardDescription>There was a problem authenticating your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Please return to the login page and try again. If the problem persists, please contact support.</p>
                </CardContent>
            </Card>
        </div>
    )
}
