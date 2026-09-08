import { configured } from '@/lib/supabase/server';
import { LoginForm } from '@/components/layout/login-form';
export default function Login() {
  return <LoginForm configured={configured()} />;
}
