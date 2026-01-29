import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { useSignUp } from "../hooks/useAuth";
import { signUpSchema } from "../validators/schemas";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const signUp = useSignUp();

  const form = useForm({
    defaultValues: {
      email: "",
      username: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const result = signUpSchema.safeParse(value);
      if (!result.success) {
        return;
      }
      signUp.mutate(value);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                const result = signUpSchema.shape.email.safeParse(value);
                return result.success ? undefined : result.error.errors[0].message;
              },
            }}
          >
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
                {field.state.meta.errors?.[0] && (
                  <p className="text-red-500 text-sm mt-1">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="username"
            validators={{
              onChange: ({ value }) => {
                const result = signUpSchema.shape.username.safeParse(value);
                return result.success ? undefined : result.error.errors[0].message;
              },
            }}
          >
            {(field) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="johndoe"
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
                const result = signUpSchema.shape.password.safeParse(value);
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

          {signUp.error && (
            <p className="text-red-500 text-sm">{signUp.error.message}</p>
          )}

          <button
            type="submit"
            disabled={signUp.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signUp.isPending ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/sign-in" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
