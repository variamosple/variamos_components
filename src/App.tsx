// The demo uses the sources, so that it is checked without a build
import {
  ResponseModel,
  type SessionInfoResponse,
  SessionProvider,
} from "../lib/main";
import "./App.css";
import { SessionConsumer } from "./Components/SessionConsumer";

const getSessionInfo = async (): Promise<ResponseModel<SessionInfoResponse>> => {
  return new ResponseModel<SessionInfoResponse>().withData({
    user: {
      id: "1",
      name: "John Doe",
      user: "JohnDoe",
      email: "john-doe@fake.com",
      roles: ["guest"],
      permissions: [],
    },
  });
};

const requestLogout = async () => {
  return new ResponseModel<void>();
};

function App() {
  return (
    <SessionProvider
      getSessionInfo={getSessionInfo}
      loginUrl="/login"
      requestLogout={requestLogout}
    >
      <SessionConsumer />
    </SessionProvider>
  );
}

export default App;
