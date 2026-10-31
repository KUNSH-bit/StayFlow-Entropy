# StayFlow frontend

React 18 and Vite dashboard for StayFlow. The UI uses the credentialed API client in `src/api.ts`; it does not contain seeded hotel data or demo credentials.

```sh
npm install
cp -n .env.example .env  # leaves an existing .env untouched
npm run dev
```

The development server listens at `http://127.0.0.1:5173`. Set `VITE_API_BASE_URL` to the server API base URL when deploying the frontend separately. Keep the frontend and API on a compatible HTTPS site so the `SameSite=Lax` session cookie can be sent.

```sh
npm run build
```

New owner accounts create a hotel workspace. Team members can join from an invitation link. Add rooms before taking bookings.
