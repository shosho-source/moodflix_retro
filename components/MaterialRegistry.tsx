"use client";

import { useEffect } from "react";

export default function MaterialRegistry() {
  useEffect(() => {
    // Only register custom elements on the client
    import("@material/web/button/filled-button.js");
    import("@material/web/button/text-button.js");
    import("@material/web/iconbutton/icon-button.js");
    import("@material/web/progress/linear-progress.js");
    import("@material/web/list/list.js");
    import("@material/web/list/list-item.js");
    import("@material/web/radio/radio.js");
    import("@material/web/checkbox/checkbox.js");
    import("@material/web/elevation/elevation.js");
    import("@material/web/ripple/ripple.js");
    import("@material/web/icon/icon.js");
  }, []);

  return null;
}
