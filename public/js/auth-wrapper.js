(function () {
  // 🌐 Global Arabic to English Number Converter (Reliable for Mobile/Pasting/IME)
  // ✅ Optimized with Event Delegation to cover dynamically added elements
  document.addEventListener(
    "input",
    function (e) {
      const { target } = e;
      if (
        target &&
        (target.tagName.toLowerCase() === "input" ||
          target.tagName.toLowerCase() === "textarea")
      ) {
        const { value } = target;
        // 🌐 Convert Arabic numbers to English numbers
        const convertedValue = value.replace(/[٠-٩]/g, (d) =>
          "٠١٢٣٤٥٦٧٨٩".indexOf(d),
        );

        if (value !== convertedValue) {
          const start = target.selectionStart;
          const end = target.selectionEnd;
          target.value = convertedValue;
          try {
            target.setSelectionRange(start, end);
          } catch (err) {}
        }
      }
    },
    true,
  ); // Use capture phase to ensure it runs early

  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    config = config || {};

    // 🛡️ Add Timeout (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    if (!config.signal) {
      config.signal = controller.signal;
    }

    // Don't add token to login requests
    if (
      typeof resource === "string" &&
      (resource.includes("/login") || resource.includes("/api/auth/login"))
    ) {
      try {
        const response = await originalFetch(resource, config);
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          console.error("❌ Request Timed Out:", resource);
        }
        throw err;
      }
    }

    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};

      if (typeof Headers !== "undefined" && config.headers instanceof Headers) {
        if (!config.headers.has("Authorization")) {
          config.headers.set("Authorization", `Bearer ${token}`);
        }
      } else if (
        !config.headers["Authorization"] &&
        !config.headers["authorization"]
      ) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      const response = await originalFetch(resource, config);
      clearTimeout(timeoutId);

      if (response.status === 401 && !resource.includes("/login")) {
        console.warn("⚠️ Unauthorized access - redirecting to login");
        localStorage.removeItem("token");
        window.location.href = "/index.html";
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        console.error("❌ Request Timed Out:", resource);
        // Simple Alert for critical failures
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "خطأ في الاتصال",
            text: "انتهت مهلة الطلب، يرجى التحقق من الشبكة.",
          });
        }
      }
      throw err;
    }
  };
})();
