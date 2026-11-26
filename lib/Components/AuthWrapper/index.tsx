import type React from "react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { createPortal } from "react-dom";
import { type PageTexts, pageText } from "../../Common/pageText";
import { useRouter, useSession } from "../../Context";
import { addressWithoutToken } from "./addressWithoutToken";
import { useTopDialogSlot } from "./topDialog";

interface AuthWrapperProps {
  redirectPath: string;
  children?: ReactNode;
}

// While nothing can be saved, no form of the page is sent: the request
// would be refused, and the input is kept on the page instead (TRV-65).
// Caught before React, on the way down, for the forms of dialogs too.
const blockSubmit = (event: Event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
};

export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  redirectPath,
  children,
}) => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { isAuthenticated, isLoading, isServerUnreachable, isReadOnly } =
    useSession();
  const { navigate } = useRouter();
  // A session this page had, ended since: the sign-in page says so
  const wasSignedInRef = useRef(false);
  if (isAuthenticated) wasSignedInRef.current = true;

  const redirectToSignIn = useCallback(() => {
    const searchParams = new URLSearchParams();
    if (wasSignedInRef.current) searchParams.set("reason", "session-expired");
    searchParams.set("redirectTo", encodeURIComponent(window.location.href));

    setIsRedirecting(true);
    setTimeout(
      () => navigate(`${redirectPath}?${searchParams.toString()}`),
      300,
    );
  }, [navigate, redirectPath]);

  // Sent to the sign-in page only when the admin says the session is over,
  // never because the admin did not answer (ADM-N09)
  useEffect(() => {
    if (
      !isLoading &&
      !isAuthenticated &&
      !isServerUnreachable &&
      !isRedirecting
    ) {
      redirectToSignIn();
    }
  }, [
    isAuthenticated,
    isLoading,
    isServerUnreachable,
    isRedirecting,
    redirectToSignIn,
  ]);

  useEffect(() => {
    // Removed from the address, never stored (EV-75)
    const address = addressWithoutToken(window.location.href);
    if (address) {
      window.history.replaceState({}, "", address);
    }
  }, []);

  useEffect(() => {
    if (!isReadOnly) return;
    document.addEventListener("submit", blockSubmit, true);
    return () => document.removeEventListener("submit", blockSubmit, true);
  }, [isReadOnly]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center gap-3 w-100 h-100">
        <Spinner
          animation="border"
          variant="primary"
          style={{ width: "3rem", height: "3rem", borderWidth: "0.5rem" }}
        />
        {!isLoading && isServerUnreachable ? (
          <p role="status">{pageText(TEXTS.unreachableFirstLoad)}</p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <SessionBanner onSignInHere={redirectToSignIn} />
      {children}
    </>
  );
};

/**
 * The banner stays at the top of the screen, above the page. While a dialog
 * is open, it goes into the dialog on top, first: the dialog keeps the focus
 * inside it and hides the rest of the page from screen readers, so that the
 * banner is reached from the keyboard and announced there (EV-96). Above
 * the content of the dialog too (the Bootstrap dialog is at 1055).
 */
const BANNER_STYLE = Object.freeze({
  position: "sticky",
  top: 0,
  zIndex: 1060,
} as const);

/**
 * What the page says about its session, above the page or in the dialog on
 * top: nothing while the session is open and the admin answers.
 */
const SessionBanner: React.FC<{ onSignInHere: () => void }> = ({
  onSignInHere,
}) => {
  const slot = useTopDialogSlot();
  const banner = <SessionBannerContent onSignInHere={onSignInHere} />;
  return slot ? createPortal(banner, slot, "session-banner") : banner;
};

const SessionBannerContent: React.FC<{ onSignInHere: () => void }> = ({
  onSignInHere,
}) => {
  const { isServerUnreachable, isReadOnly, isSessionClosed } = useSession();

  if (isSessionClosed) {
    return <SessionClosedBanner onSignInHere={onSignInHere} />;
  }
  if (!isServerUnreachable) return null;
  return (
    <Alert
      style={BANNER_STYLE}
      variant="warning"
      role="status"
      className="m-0 rounded-0 py-2 text-center"
    >
      {pageText(isReadOnly ? TEXTS.connectionLost : TEXTS.unreachableSignedIn)}
    </Alert>
  );
};

/**
 * The session is over, and a form holds unsaved input: the page stays, read
 * only. Signing in again in another tab opens the session for this page;
 * signing in here drops the input, so it is asked first.
 */
const SessionClosedBanner: React.FC<{ onSignInHere: () => void }> = ({
  onSignInHere,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <Alert
      style={BANNER_STYLE}
      variant="danger"
      role="alert"
      className="m-0 rounded-0 py-2"
    >
      <p className="mb-2">{pageText(TEXTS.sessionClosed)}</p>
      {isConfirming ? (
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span>{pageText(TEXTS.signInHereLoses)}</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsConfirming(false)}
          >
            {pageText(TEXTS.keepInput)}
          </Button>
          <Button size="sm" variant="danger" onClick={onSignInHere}>
            {pageText(TEXTS.dropInputAndSignIn)}
          </Button>
        </div>
      ) : (
        <div className="d-flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              window.open(window.location.href, "_blank", "noopener")
            }
          >
            {pageText(TEXTS.signInNewTab)}
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => setIsConfirming(true)}
          >
            {pageText(TEXTS.signInHere)}
          </Button>
        </div>
      )}
    </Alert>
  );
};

// cspell:disable -- texts in Spanish and French
/** The texts of the session, in each language of the components. */
export const SESSION_TEXTS = Object.freeze({
  unreachableSignedIn: {
    en: "The server cannot be reached. Your session and this page are kept; trying again…",
    es: "No se puede contactar con el servidor. Su sesión y esta página se conservan; reintentando…",
    fr: "Le serveur ne répond pas. Votre session et cette page sont gardées ; nouvel essai en cours…",
  },
  unreachableFirstLoad: {
    en: "The server cannot be reached. Trying again…",
    es: "No se puede contactar con el servidor. Reintentando…",
    fr: "Le serveur ne répond pas. Nouvel essai en cours…",
  },
  connectionLost: {
    en: "Connection lost: your input is kept on this page. Saving is off until the server answers again; trying again…",
    es: "Conexión perdida: lo que escribió se conserva en esta página. No se puede guardar hasta que el servidor vuelva a responder; reintentando…",
    fr: "Connexion perdue : votre saisie est gardée sur cette page. L'enregistrement reprendra quand le serveur répondra de nouveau ; nouvel essai en cours…",
  },
  sessionClosed: {
    en: "Your session has ended. Your input is still on this page: copy it, or sign in again in a new tab, then come back here to save it.",
    es: "Su sesión ha terminado. Lo que escribió sigue en esta página: cópielo, o vuelva a iniciar sesión en una pestaña nueva y regrese aquí para guardarlo.",
    fr: "Votre session est terminée. Votre saisie est toujours sur cette page : copiez-la, ou reconnectez-vous dans un nouvel onglet, puis revenez ici pour l'enregistrer.",
  },
  signInNewTab: {
    en: "Sign in in a new tab",
    es: "Iniciar sesión en una pestaña nueva",
    fr: "Se reconnecter dans un nouvel onglet",
  },
  signInHere: {
    en: "Sign in here",
    es: "Iniciar sesión aquí",
    fr: "Se reconnecter ici",
  },
  signInHereLoses: {
    en: "Signing in here drops your unsaved input.",
    es: "Iniciar sesión aquí descarta lo que no se ha guardado.",
    fr: "Se reconnecter ici abandonne la saisie non enregistrée.",
  },
  keepInput: {
    en: "Keep my input",
    es: "Conservar lo escrito",
    fr: "Garder ma saisie",
  },
  dropInputAndSignIn: {
    en: "Drop my input and sign in",
    es: "Descartar y iniciar sesión",
    fr: "Abandonner ma saisie et me reconnecter",
  },
} satisfies Record<string, PageTexts>);
// cspell:enable

const TEXTS = SESSION_TEXTS;

/** Shown above the page: the session and the page are kept. */
export const SERVER_UNREACHABLE_SIGNED_IN = TEXTS.unreachableSignedIn.en;

/** Shown instead of the page when no session could be read yet. */
export const SERVER_UNREACHABLE_FIRST_LOAD = TEXTS.unreachableFirstLoad.en;
