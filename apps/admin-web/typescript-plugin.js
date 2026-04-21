/**
 * Plugin de TypeScript para suprimir warnings específicos de Next.js
 */

function init(modules) {
  const ts = modules.typescript;

  function create(info) {
    // Get the original language service
    const proxy = Object.create(null);
    const oldLS = info.languageService;

    for (const k in oldLS) {
      proxy[k] = function (...args) {
        return oldLS[k].apply(oldLS, args);
      };
    }

    // Override getSemanticDiagnostics to filter out Next.js serialization warnings
    proxy.getSemanticDiagnostics = (fileName) => {
      const diagnostics = oldLS.getSemanticDiagnostics(fileName);

      // Filter out "Props must be serializable" warnings
      return diagnostics.filter((diagnostic) => {
        const message =
          typeof diagnostic.messageText === 'string'
            ? diagnostic.messageText
            : diagnostic.messageText?.messageText || '';

        return !message.includes('Props must be serializable');
      });
    };

    return proxy;
  }

  return { create };
}

module.exports = init;
