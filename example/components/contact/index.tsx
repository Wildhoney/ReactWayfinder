import type { ReactElement } from "react";
import { Route } from "react-wayfinder";
import ContactSkeleton from "./skeleton";
import { router } from "../../utils";
import Navigation from "../navigation";
import type { ContactMethod } from "./types";
import { Page, SubNav, Tab, Content } from "./styles";
import { Spinner } from "../../styles";

const methods: { method: ContactMethod; label: string }[] = [
  { method: "email", label: "Email" },
  { method: "telephone", label: "Telephone" },
  { method: "postal", label: "Postal" },
];

type Props =
  | {
      method: "email" | "telephone";
      status?: undefined;
      address?: undefined;
      error?: undefined;
    }
  | {
      method: "postal";
      status: "loading";
      address?: undefined;
      error?: undefined;
    }
  | { method: "postal"; status: "ready"; address: string; error?: undefined }
  | { method: "postal"; status: "error"; address?: undefined; error: Error };

export default function Contact({
  method,
  status,
  address,
  error,
}: Props): ReactElement {
  const context = router.useContext();

  return (
    <>
      <Navigation />
      <Page>
        <h1>Contact</h1>
        <SubNav>
          {methods.map(({ method: value, label }) => (
            <Route key={value} href={context.url.contact({ method: value })}>
              {(route) => (
                <Tab href={route.href} active={route.active}>
                  {label}
                  {value === "postal" && route.pending ? <Spinner /> : null}
                </Tab>
              )}
            </Route>
          ))}
        </SubNav>
        <Content>
          {method === "email" && (
            <>
              <h2>Email</h2>
              <p>
                Send us an email at hello@example.com and we will get back to
                you within 24 hours.
              </p>
            </>
          )}
          {method === "telephone" && (
            <>
              <h2>Telephone</h2>
              <p>
                Call us on +44 20 7946 0958, available Monday to Friday, 9am–5pm
                GMT.
              </p>
            </>
          )}
          {method === "postal" && status === "loading" && <ContactSkeleton />}
          {method === "postal" && status === "error" && (
            <>
              <h2>Postal</h2>
              <p>Error: {error?.message}</p>
            </>
          )}
          {method === "postal" && status === "ready" && (
            <>
              <h2>Postal</h2>
              <p>Write to us at {address}.</p>
            </>
          )}
        </Content>
      </Page>
    </>
  );
}
