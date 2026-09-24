// Release builds (R8 + Hermes) need more JVM memory than the template default.
const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    const set = (key, value) => {
      const existing = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
      if (existing) existing.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    };
    set('org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8');
    set('org.gradle.parallel', 'true');
    set('org.gradle.caching', 'true');
    return cfg;
  });
};
