# Collegare l'accesso all'app

Due modifiche in `src/App.jsx`.

## 1. Importare la pagina di accesso

Fra gli altri import in cima al file:

```js
import Login from './pages/Login';
```

## 2. Aggiungere la rotta e togliere il rimando a Base44

Dentro `AuthenticatedApp`, la parte che oggi dice:

```js
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }
```

diventa:

```js
  // Non autenticato: si mostra la schermata di accesso.
  if (!isAuthenticated) {
    return <Login />;
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }
```

e nella riga che estrae i valori dal contesto:

```js
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
```

aggiungere `isAuthenticated`:

```js
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
```

## 3. Verifica

```
npm run dev
```

L'app deve mostrare la schermata di accesso. Entrando con uno degli
utenti di prova si arriva alla selezione del ruolo.

## Nota

Le pagine continuano a leggere i DATI da Base44 finche' non vengono
migrate una per una: e' previsto. Qui abbiamo collegato solo l'accesso.
