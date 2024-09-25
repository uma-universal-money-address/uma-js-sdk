import { useOAuth } from "./main";
import { ConnectUma } from "./steps/ConnectUma";
import { ConnectedWallet } from "./steps/ConnectedWallet";
import { DoneConnecting } from "./steps/DoneConnecting";
import { ErrorConnecting } from "./steps/ErrorConnecting";
import { ForgotYourUma } from "./steps/ForgotYourUma";
import { MoreOptions } from "./steps/MoreOptions";
import { NostrWalletConnect } from "./steps/NostrWalletConnect";
import { Unavailable } from "./steps/Unavailable";
import { WaitingForApproval } from "./steps/WaitingForApproval";
import { WhatIsUma } from "./steps/WhatIsUma";

export enum Step {
  Empty = "Empty",
  Connect = "Connect",
  MoreOptions = "MoreOptions",
  NostrWalletConnect = "NostrWalletConnect",
  ConnectedWallet = "ConnectedWallet",
  ConnectedUma = "ConnectedUma",
  WaitingForApproval = "WaitingForApproval",
  Unavailable = "Unavailable",
  WhatIsUma = "WhatIsUma",
  ForgotYourUma = "ForgotYourUma",
  DoneConnecting = "DoneConnecting",
  ErrorConnecting = "ErrorConnecting",
}

interface StepInfo {
  component: React.ComponentType;
  title?: string;
  prev?: Step;
  onBack?: () => void;
  onClose?: () => void;
}

export const STEP_MAP: Record<Step, StepInfo> = {
  [Step.Empty]: {
    component: () => null,
  },
  [Step.Connect]: {
    component: ConnectUma,
  },
  [Step.MoreOptions]: {
    component: MoreOptions,
    title: "More options",
    prev: Step.Connect,
  },
  [Step.NostrWalletConnect]: {
    component: NostrWalletConnect,
    title: "Nostr Wallet Connect",
    prev: Step.MoreOptions,
  },
  [Step.ConnectedWallet]: {
    component: ConnectedWallet,
    title: "Connected wallet",
  },
  [Step.ConnectedUma]: {
    component: ConnectedWallet,
    title: "Connected UMA",
  },
  [Step.WaitingForApproval]: {
    component: WaitingForApproval,
    title: "Waiting for approval",
    prev: Step.Connect,
    onBack: () => {
      useOAuth.getState().clearUserAuth();
    },
    onClose: () => {
      useOAuth.getState().clearUserAuth();
    },
  },
  [Step.Unavailable]: {
    component: Unavailable,
    title: "Unavailable",
    prev: Step.Connect,
  },
  [Step.WhatIsUma]: {
    component: WhatIsUma,
    title: "What is UMA?",
    prev: Step.Connect,
  },
  [Step.ForgotYourUma]: {
    component: ForgotYourUma,
    title: "Forgot your UMA?",
    prev: Step.MoreOptions,
  },
  [Step.DoneConnecting]: {
    component: DoneConnecting,
    title: "Connect your UMA",
    prev: Step.Connect,
  },
  [Step.ErrorConnecting]: {
    component: ErrorConnecting,
    title: "Connect your UMA",
    prev: Step.Connect,
  },
};
