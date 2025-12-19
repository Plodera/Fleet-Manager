import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Car, Truck, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function Auth() {
  const { login, register, isLoggingIn, isRegistering, user } = useAuth();
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [regData, setRegData] = useState({ 
    username: "", password: "", fullName: "", role: "customer", licenseNumber: "", department: "" 
  });

  if (user) {
    setLocation("/");
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register({ ...regData, role: regData.role as "customer" | "admin" | "staff" });
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="space-y-6 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">FleetCmD</h2>
                <p className="text-white/70 text-sm">Aisco Transport Mgmt</p>
              </div>
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              Streamline Your Fleet Operations
            </h1>
            <p className="text-lg text-white/80">
              Manage vehicle bookings, track maintenance, monitor fuel costs, and optimize your transport operations all in one place.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur">
                <Truck className="w-5 h-5" />
                <span className="text-sm font-medium">Fleet Tracking</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Secure Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2 lg:hidden">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/30">
              <Car className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">FleetCmD</h1>
            <p className="text-muted-foreground">Aisco Transport Mgmt</p>
          </div>

          <div className="hidden lg:block text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">Welcome</h2>
            <p className="text-muted-foreground mt-1">Sign in to access your dashboard</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-none shadow-xl bg-card/80 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Sign in to your account</CardTitle>
                  <CardDescription>Enter your credentials to continue</CardDescription>
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
                  <CardFooter className="flex-col gap-4">
                    <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/25" disabled={isLoggingIn} data-testid="button-login">
                      {isLoggingIn ? "Signing in..." : "Sign In"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Protected by Aisco security protocols
                    </p>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-none shadow-xl bg-card/80 backdrop-blur">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Create your account</CardTitle>
                  <CardDescription>Join Aisco Transport Management</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-fullname">Full Name</Label>
                        <Input 
                          id="reg-fullname" 
                          placeholder="John Doe" 
                          value={regData.fullName} 
                          onChange={e => setRegData({...regData, fullName: e.target.value})} 
                          required
                          className="h-11"
                          data-testid="input-register-fullname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-username">Username</Label>
                        <Input 
                          id="reg-username" 
                          placeholder="jdoe" 
                          value={regData.username} 
                          onChange={e => setRegData({...regData, username: e.target.value})} 
                          required
                          className="h-11"
                          data-testid="input-register-username"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input 
                        id="reg-password" 
                        type="password"
                        placeholder="Create a secure password"
                        value={regData.password} 
                        onChange={e => setRegData({...regData, password: e.target.value})} 
                        required
                        className="h-11"
                        data-testid="input-register-password"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-license">License Number</Label>
                        <Input 
                          id="reg-license"
                          placeholder="Optional"
                          value={regData.licenseNumber} 
                          onChange={e => setRegData({...regData, licenseNumber: e.target.value})}
                          className="h-11"
                          data-testid="input-register-license"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-dept">Department</Label>
                        <Input 
                          id="reg-dept"
                          placeholder="Optional"
                          value={regData.department} 
                          onChange={e => setRegData({...regData, department: e.target.value})}
                          className="h-11"
                          data-testid="input-register-department"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/25" disabled={isRegistering} data-testid="button-register">
                      {isRegistering ? "Creating account..." : "Create Account"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
