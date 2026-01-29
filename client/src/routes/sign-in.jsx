import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useSignIn } from "../hooks/useAuth";
import { signInSchema } from "../validators/schemas";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const signIn = useSignIn();

  const form = useForm({
    defaultValues: {
      identifier: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const result = signInSchema.safeParse(value);
      if (!result.success) {
        return;
      }
      signIn.mutate(value);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="identifier"
            validators={{
              onChange: ({ value }) => {
                const result = signInSchema.shape.identifier.safeParse(value);
                return result.success ? undefined : result.error.errors[0].message;
              },
            }}
          >
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email or Username</label>
                <input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com or username"
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-red-500 text-sm mt-1">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) => {
                const result = signInSchema.shape.password.safeParse(value);
                return result.success ? undefined : result.error.errors[0].message;
              },
            }}
          >
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••"
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-red-500 text-sm mt-1">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          {signIn.error && (
            <p className="text-red-500 text-sm">{signIn.error.message}</p>
          )}

          <button
            type="submit"
            disabled={signIn.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signIn.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/sign-up" className="text-blue-600 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
