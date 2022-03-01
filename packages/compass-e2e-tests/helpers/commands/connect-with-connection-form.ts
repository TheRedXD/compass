import type { CompassBrowser } from '../compass-browser';
import type { AuthMechanism } from 'mongodb';

import * as Selectors from '../selectors';

const defaultTimeoutMS = 30_000;

type ConnectOptions = {
  host: string;
  port?: number;
  srvRecord?: boolean;
  username?: string;
  password?: string;
  authMechanism?: AuthMechanism;
  gssapiServiceName?: string;
  replicaSet?: string;
  tls?: boolean | 'default';
  tlsAllowInvalidHostnames?: boolean;
  sslValidate?: boolean;
  tlsCAFile?: string;
  tlsCertificateKeyFile?: string;
  useSystemCA?: boolean;
  sshTunnelHostname?: string;
  sshTunnelPort?: string;
  sshTunnelUsername?: string;
  sshTunnelPassword?: string;
  sshTunnelIdentityFile?: string;
};

export async function connectWithConnectionForm(
  browser: CompassBrowser,
  options: ConnectOptions,
  timeout = defaultTimeoutMS,
  connectionStatus: 'success' | 'failure' | 'either' = 'success'
): Promise<void> {
  const {
    host,
    port,
    srvRecord,
    authMechanism,
    username,
    password,
    tls,
    useSystemCA,
  } = options;

  const connectionFormButtonElement = await browser.$(
    Selectors.ShowConnectionFormButton
  );
  if (await connectionFormButtonElement.isDisplayed()) {
    await browser.clickVisible(Selectors.ShowConnectionFormButton);
  }

  await browser.clickVisible(Selectors.ConnectionFormGeneralTabButton);

  if (typeof host !== 'undefined') {
    const element = await browser.$(Selectors.ConnectionFormInputHost);
    await element.setValue(port ? `${host}:${port}` : host);
  }

  if (srvRecord === true) {
    await browser.clickVisible(Selectors.ConnectionFormInputSrvRecord);
  }

  if (authMechanism === 'DEFAULT') {
    await fillAuthMechanismDefaultFields(browser, { username, password });
  }

  if (typeof tls !== 'undefined') {
    await fillTLSFields(browser, { tls, useSystemCA });
  }

  await browser.doConnect(timeout, connectionStatus);
}

async function fillAuthMechanismDefaultFields(
  browser: CompassBrowser,
  { username, password }: Pick<ConnectOptions, 'username' | 'password'>
): Promise<void> {
  await browser.clickVisible(Selectors.ConnectionFormAuthenticationTabButton);
  await browser.clickVisible(Selectors.ConnectionFormDefaultAuthMethodButton);
  const usernameInput = await browser.$(Selectors.ConnectionFormInputUsername);
  await usernameInput.setValue(username);

  const passwordInput = await browser.$(Selectors.ConnectionFormInputPassword);
  await passwordInput.setValue(password);
}

async function fillTLSFields(
  browser: CompassBrowser,
  { tls, useSystemCA }: Pick<ConnectOptions, 'tls' | 'useSystemCA'>
): Promise<void> {
  await browser.clickVisible(Selectors.ConnectionFormTLSTabButton);
  if (tls === true) {
    await browser.clickVisible(Selectors.ConnectionFormTLSONButton);
  } else if (tls === false) {
    await browser.clickVisible(Selectors.ConnectionFormTLSOFFButton);
  }

  if (useSystemCA) {
    await browser.clickVisible(Selectors.ConnectionFormTLSUseSystemCA);
  }
}
