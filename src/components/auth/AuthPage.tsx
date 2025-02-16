import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthError {
  message: string;
  status?: number;
}

export function AuthPage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log(" Tentative de connexion pour:", loginEmail);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        const authError = error as AuthError;
        console.error(" Erreur de connexion:", authError.message);
        throw error;
      }

      console.log(" Connexion réussie pour:", data.user?.email);
      toast({
        title: "Connexion réussie",
        description: "Vous êtes maintenant connecté.",
      });
      navigate("/");
    } catch (error) {
      const authError = error as AuthError;
      console.error(" Erreur lors de la connexion:", authError.message);
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: authError.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : authError.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log(" Tentative d'inscription pour:", signupEmail);

    if (signupPassword !== signupConfirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: "Les mots de passe ne correspondent pas",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });

      if (error) {
        const authError = error as AuthError;
        console.error(" Erreur d'inscription:", authError.message);
        throw error;
      }

      console.log(" Inscription réussie pour:", data.user?.email);
      toast({
        title: "Inscription réussie",
        description: "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
      });
      navigate("/");
    } catch (error) {
      const authError = error as AuthError;
      console.error(" Erreur lors de l'inscription:", authError.message);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: authError.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Authentification</CardTitle>
          <CardDescription>
            Connectez-vous ou créez un compte pour accéder à l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Inscription..." : "S'inscrire"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          Transcripteur Whisper - Authentification sécurisée
        </CardFooter>
      </Card>
    </div>
  );
}