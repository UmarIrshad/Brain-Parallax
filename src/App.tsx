import { useState } from "react";
import ParallaxSection from "./components/ParallaxSection";
import Version2 from "./components/Version2";
import VersionSwitcher, { type Version } from "./components/VersionSwitcher";

export default function App() {
  const [version, setVersion] = useState<Version>(1);

  return (
    <main>
      <VersionSwitcher active={version} onChange={setVersion} />
      {version === 1 ? <ParallaxSection /> : <Version2 />}
    </main>
  );
}
