# Storyloom — Developer Friction Log

Real problems we hit while building Storyloom for Fire TV with AWS, written in the format the Amazon
Developer team asked for. Each entry: task, steps, expected vs. actual, severity, workaround, suggestion.

Severity scale: **Blocker** (couldn't continue) · **High** (hours lost / risky workaround) · **Medium** (clear workaround) · **Low** (papercut)

---

## 1. Vega SDK can't be installed on Windows

| | |
|---|---|
| **Tool** | Vega Developer Tools / Vega Virtual Device |
| **Task** | Build and run Storyloom on Vega OS (Fire TV Stick 4K Select) |
| **Steps** | Opened *Install the Vega Developer Tools*; followed the CLI path |
| **Expected** | A Windows installer or WSL2 instructions, since Windows is the most common student/dev OS |
| **Actual** | Only macOS and Ubuntu are documented (KVM required). No Windows or WSL2 path, and no statement of whether WSL2 is supported |
| **Severity** | High (blocks Vega entirely for Windows-only developers) |
| **Workaround** | Targeted Fire OS instead (React Native for TV + Android TV emulator, API 30 = Fire OS 8). Kept the code Vega-ready: platform files, `react-tv-space-navigation`, no Fire OS-only APIs in shared UI |
| **Suggestion** | Publish a supported WSL2 guide (Win 11 supports nested virtualization), or a cloud Vega Virtual Device developers can stream in a browser |

## 2. `react-native-keyevent` fails to install next to `react-native-tvos`

| | |
|---|---|
| **Tool** | react-native-multi-tv-app-sample pattern (react-native-tvos 0.81 + react-native-keyevent) |
| **Task** | Forward Fire TV remote D-pad keys to JS for spatial navigation, as the Amazon sample does |
| **Steps** | `npm install react-native-keyevent@0.3.2` in an Expo SDK 54 app where `react-native` is `npm:react-native-tvos@0.81.5-2` |
| **Expected** | Clean install (the sample uses the same library) |
| **Actual** | `ERESOLVE`: peer `react-native@>=0.30` does not match the prerelease version `0.81.5-2`, so npm refuses to install |
| **Severity** | Medium |
| **Workaround** | Added `legacy-peer-deps=true` in `apps/tv/.npmrc` so judges' installs also work |
| **Suggestion** | Mention this in the sample README (the sample uses Yarn, which only warns), or switch the sample's Android remote handling to `TVEventHandler` from react-native-tvos so no extra native module is needed |

## 3. Amazon Polly generative voices don't return speech marks

| | |
|---|---|
| **Tool** | Amazon Polly (generative engine) |
| **Task** | Karaoke-style read-along: highlight each word as the narrator speaks it (a literacy feature for kids) |
| **Steps** | `SynthesizeSpeech` with `Engine=generative`, `OutputFormat=json`, `SpeechMarkTypes=["word"]` |
| **Expected** | Word timings, as with neural voices |
| **Actual** | Docs: *"Support for generating speech marks is currently not available"* for generative voices. The most natural storyteller voices can't drive read-along |
| **Severity** | Medium |
| **Workaround** | Narrate sentence by sentence, measure each MP3 clip exactly by parsing MPEG frame headers, then spread word timings within each sentence by word length. Accurate enough for a child to follow, and keeps the best voice (`services/agent/storyloom/narrator.py`, `mp3.py`) |
| **Suggestion** | Add word speech marks to the generative engine, or return per-sentence durations in the response metadata |

## 4. AgentCore direct code deployment: packaging on Windows

| | |
|---|---|
| **Tool** | Amazon Bedrock AgentCore Runtime (direct code deployment, Python) |
| **Task** | Build the arm64 `.zip` for the Strands agent on a Windows laptop without Docker |
| **Steps** | Followed *Direct code deployment for Python*: `uv pip install --python-platform aarch64-manylinux2014 ...` then `zip -r` |
| **Expected** | A cross-platform packaging command |
| **Actual** | `zip` isn't available on Windows, and the docs note files need 644/755 Linux permissions but only link to Windows ACL docs, which don't affect permissions stored inside a zip |
| **Severity** | Medium |
| **Workaround** | Wrote `services/agent/build.py` using Python's `zipfile`, setting `external_attr` to 0644/0755 for every entry |
| **Suggestion** | Ship a small cross-platform `package` command in the AgentCore CLI/toolkit that works with an existing `requirements.txt` |

## 5. AWS CDK: WebSocket integration named `Default` breaks synth

| | |
|---|---|
| **Tool** | AWS CDK v2 (`aws-apigatewayv2` WebSocketApi) |
| **Task** | Define `$connect`, `$disconnect` and `$default` routes, each with a `WebSocketLambdaIntegration` |
| **Steps** | Named the integrations `Connect`, `Disconnect`, `Default` |
| **Expected** | Three routes |
| **Actual** | `section 'Resources' already contains 'RealtimedefaultRoute…'` from deep inside `stack.js`. A construct id of `Default` is special in CDK, so the integration got the same logical id as its route |
| **Severity** | Low (but about 20 minutes lost reading minified stack traces) |
| **Workaround** | Renamed the integration ids (`WsConnect`, `WsDisconnect`, `WsMessage`) |
| **Suggestion** | Validate integration ids, or give the error message a hint about the reserved `Default` id |

## 6. No Fire OS emulator; Fire TV specifics are hard to find for emulator users

| | |
|---|---|
| **Tool** | Fire TV docs / hackathon FAQ |
| **Task** | Pick an emulator that best matches a real Fire TV Stick |
| **Steps** | FAQ says an Android TV emulator is fine; searched docs for which API level and launcher assets matter |
| **Expected** | A short "Fire OS in an Android TV emulator" guide: Fire OS 7 = API 28, Fire OS 8 = API 30, banner sizes, what differs (voice key goes to Alexa, no Google services) |
| **Actual** | Information is spread across several pages |
| **Severity** | Low |
| **Workaround** | Used Android TV API 30 (Fire OS 8 parity), 1080p, D-pad enabled; avoided Google Play Services entirely |
| **Suggestion** | A one-page "Develop for Fire OS without a device" guide with an AVD config file ready to import |

## 7. New AWS "Free plan" accounts: every Bedrock model has a quota of 0, with a misleading error

| | |
|---|---|
| **Tool** | Amazon Bedrock (with a new AWS account on the Free plan, as many hackathon students have) |
| **Task** | First Bedrock call with Nova 2 Lite from the CLI |
| **Steps** | `aws bedrock-runtime converse --model-id us.amazon.nova-2-lite-v1:0 ...` |
| **Expected** | A reply, or a clear "your account plan doesn't include this" error |
| **Actual** | `ThrottlingException: Too many tokens per day, please wait before trying again`. Service Quotas shows **0** for every Nova and Stability quota; `aws freetier get-account-plan-state` reveals `accountPlanType: FREE`. Nothing in the error points to the plan |
| **Severity** | High (it looks like a transient throttle, so people wait and retry) |
| **Workaround** | Upgrade the account to the Paid plan (credits carry over), then request quota increases |
| **Suggestion** | Return an explicit `AccessDeniedException: Bedrock model access requires the Paid plan` for Free-plan accounts, and mention this in the hackathon's AWS credit instructions |

## 8. Nova Canvas reaches end of life mid-hackathon

| | |
|---|---|
| **Tool** | Amazon Bedrock — `amazon.nova-canvas-v1:0` |
| **Task** | Illustrate every story page with a first-party Amazon image model |
| **Steps** | `aws bedrock get-foundation-model --model-identifier amazon.nova-canvas-v1:0` |
| **Expected** | An active image model through judging (Nov 9–20) |
| **Actual** | `status: LEGACY`, `endOfLifeTime: 2026-09-30` — a week into the hackathon — and no Amazon image-generation successor listed in us-east-1 |
| **Severity** | High for image-heavy projects |
| **Workaround** | Switched illustration to Stability AI models on Bedrock (Control Sketch for a child's drawing, text-to-image for pages), which AWS credits cover |
| **Suggestion** | Announce model retirements in the hackathon updates, and list the recommended replacement model on the model card |

---

*More entries are added as we build. Last updated: see git history.*
