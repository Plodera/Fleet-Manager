import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Car } from "lucide-react";
import { useLocation } from "wouter";

export default function Auth() {
  const { login, isLoggingIn, user } = useAuth();
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ username: "", password: "" });

  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(loginData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/30">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">AAMS</h1>
            <p className="text-muted-foreground">Aisco Automobile Management System</p>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="Enter your username" 
                  value={loginData.username} 
                  onChange={e => setLoginData({...loginData, username: e.target.value})} 
                  required
                  className="h-11"
                  data-testid="input-login-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="Enter your password"
                  value={loginData.password} 
                  onChange={e => setLoginData({...loginData, password: e.target.value})} 
                  required
                  className="h-11"
                  data-testid="input-login-password"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/25" disabled={isLoggingIn} data-testid="button-login">
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Aisco Automobile Management System
        </p>
      </div>
    </div>
  );
}
