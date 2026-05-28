'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Building2 } from 'lucide-react';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.9 2.04-5.07 2.04-4.35 0-7.88-3.57-7.88-7.98s3.53-7.98 7.88-7.98c2.48 0 4.14.98 5.43 2.26l2.6-2.6C18.44 2.14 15.82 1 12.48 1 5.8 1 1 5.8 1 12s4.8 11 11.48 11c6.48 0 11.02-4.52 11.02-11.24 0-1.2-.12-2.12-.34-2.84H12.48z"
        fill="currentColor"
      />
    </svg>
);

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const result = await register(name, email, password);
    if (result.success) {
      setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
      setTimeout(() => router.push('/login'), 2000);
    } else if ('requiresConfirmation' in result) {
      setSuccess('Un email de confirmation a été envoyé. Vérifiez votre boîte mail pour activer votre compte.');
    } else {
      setError(result.error ?? "Une erreur est survenue.");
    }
  };

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2">
        <div className="hidden lg:flex flex-col items-start justify-between p-12 bg-blue-700 text-white relative">
            <div className="absolute inset-0 bg-no-repeat bg-bottom bg-contain" style={{backgroundImage: 'url("data:image/svg+xml,%3csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3crect width=\'100%25\' height=\'100%25\' fill=\'none\'/%3e%3cpath d=\'M0 450C200 250 400 250 600 450L600 0H0V450Z\' stroke=\'white\' stroke-width=\'0\' fill-opacity=\'0.1\'/%3e%3cpath d=\'M0 500C250 300 450 300 700 500L700 0H0V500Z\' stroke=\'white\' stroke-width=\'0\' fill-opacity=\'0.1\'/%3e%3c/svg%3e")'}}></div>
            
            <div className="relative">
                <Building2 className="h-10 w-10" />
            </div>

            <div className="relative space-y-4">
                <h1 className="text-5xl font-bold">Bonjour Owoo mi! <span role="img" aria-label="waving hand">👋</span></h1>
                <p className="text-lg text-blue-200">
                    Gagnez en productivité grâce à l'automatisation et économisez énormément de temps.
                </p>
            </div>
            
            <p className="relative text-sm text-blue-300">&copy; {new Date().getFullYear()} Owoo mi. Tous droits réservés.</p>
        </div>
        <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
            <div className="w-full max-w-md space-y-6">
                 <div>
                    <h2 className="text-3xl font-bold tracking-tight">Créer un compte</h2>
                    <p className="text-muted-foreground mt-2">
                        Vous avez déjà un compte ?{' '}
                        <Link href="/login" className="text-primary font-semibold hover:underline">
                            Connectez-vous.
                        </Link>
                    </p>
                </div>
              <form onSubmit={handleSubmit} className="grid gap-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erreur d'inscription</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {success && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Succès</AlertTitle>
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full bg-gray-900 text-white hover:bg-gray-800">
                  Créer un compte
                </Button>
                <Button variant="outline" className="w-full">
                    <GoogleIcon className="mr-2 h-4 w-4" />
                    S'inscrire avec Google
                </Button>
              </form>
            </div>
        </div>
    </div>
  );
}
