// ABOUTME: Routed sign-in / create-account modal (/sign-in). Returns the user to ?next= (same-origin paths only).
// ABOUTME: No identity is prefilled and there is no alternative sign-in method; the server decides every role.
import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../../lib/api.ts';
import { useLogin, useRegister } from '../../lib/auth.tsx';
import { Button, Input, Modal, Tabs, useToast } from '../ui/index.ts';

const TABS = [
  { id: 'signin', label: 'Sign in' },
  { id: 'register', label: 'Create account' },
];

/** Only same-origin absolute paths are honoured, so ?next= cannot become an open redirect. */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\') ? raw : '/';
}

function fieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError && Array.isArray(err.details)) {
    return Object.fromEntries(
      (err.details as { path: string; message: string }[]).map((d) => [d.path.replace(/^body\./, ''), d.message]),
    );
  }
  return {};
}

export function AuthenticationModal() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('signin');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const login = useLogin();
  const register = useRegister();
  const pending = login.isPending || register.isPending;
  const next = safeNext(params.get('next'));

  const close = () => navigate('/', { replace: true });
  const done = (name: string) => {
    toast.success(`Welcome, ${name}`);
    navigate(next, { replace: true });
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') ?? '');
    const password = String(f.get('password') ?? '');
    const onError = (err: Error) => {
      const fe = fieldErrors(err);
      if (Object.keys(fe).length) setErrors(fe);
      else setErrors({ form: err.message });
    };
    if (tab === 'signin') login.mutate({ email, password }, { onSuccess: (u) => done(u.displayName), onError });
    else register.mutate({ email, password, displayName: String(f.get('displayName') ?? '') }, { onSuccess: (u) => done(u.displayName), onError });
  };

  return (
    <Modal open onClose={close} title={tab === 'signin' ? 'Sign in' : 'Create account'} size="sm">
      <Tabs tabs={TABS} value={tab} onChange={(t) => (setTab(t), setErrors({}))} idPrefix="auth" />
      <form id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${tab}`} onSubmit={submit} className="mt-5 space-y-4" noValidate>
        {tab === 'register' && <Input name="displayName" label="Full name" autoComplete="name" required error={errors.displayName} />}
        <Input name="email" type="email" label="Email" autoComplete="email" required error={errors.email} />
        <Input
          name="password"
          type="password"
          label="Password"
          autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
          hint={tab === 'register' ? 'At least 10 characters.' : undefined}
          required
          error={errors.password}
        />
        {errors.form && (
          <p role="alert" className="text-sm text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" className="w-full" loading={pending}>
          {tab === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </Modal>
  );
}
