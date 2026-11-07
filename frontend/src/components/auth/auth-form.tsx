'use client';

import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { safeNextPath, useSession } from '@/lib/auth';

type Mode = 'login' | 'register';

const COPY = {
  login: {
    title: 'Sign in',
    lead: 'Welcome back. Your datasets are waiting.',
    submit: 'Sign in',
    busy: 'Signing in',
    switchText: 'New to InsightLens?',
    switchLink: 'Create an account',
    switchHref: '/register',
  },
  register: {
    title: 'Create an account',
    lead: 'Upload your own CSV files and keep every report.',
    submit: 'Create account',
    busy: 'Creating account',
    switchText: 'Already have an account?',
    switchLink: 'Sign in',
    switchHref: '/login',
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const { status, logIn, register } = useSession();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === 'authenticated') router.replace(next);
  }, [status, next, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      if (mode === 'login') {
        await logIn({ email, password });
      } else {
        await register({ name: String(form.get('name')), email, password });
      }
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.some((e) => e.path)) {
        setFieldErrors(
          Object.fromEntries(error.fieldErrors.map((e) => [e.path, e.message])),
        );
      } else {
        setFormError(
          error instanceof Error ? error.message : 'Something went wrong.',
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {copy.title}
        </h1>
        <p className="text-muted-foreground">{copy.lead}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <p
            role="alert"
            className="bg-critical-soft text-critical rounded-lg px-3 py-2.5 text-sm"
          >
            {formError}
          </p>
        )}
        {mode === 'register' && (
          <FormField
            id="name"
            label="Name"
            autoComplete="name"
            required
            maxLength={80}
            error={fieldErrors.name}
          />
        )}
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={fieldErrors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'register' ? 8 : undefined}
          maxLength={72}
          hint={mode === 'register' ? 'At least 8 characters.' : undefined}
          error={fieldErrors.password}
        />
        <Button
          type="submit"
          className="h-10 w-full text-[15px]"
          disabled={submitting}
        >
          {submitting && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {submitting ? copy.busy : copy.submit}
        </Button>
      </form>

      <p className="text-muted-foreground text-sm">
        {copy.switchText}{' '}
        <Link
          href={
            next === '/datasets'
              ? copy.switchHref
              : `${copy.switchHref}?next=${encodeURIComponent(next)}`
          }
          className="text-primary rounded-sm font-medium hover:underline"
        >
          {copy.switchLink}
        </Link>
      </p>
    </div>
  );
}
