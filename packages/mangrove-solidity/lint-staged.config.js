// lint-staged.config.js
import micromatch from "micromatch";

export default {
  "*.sol": (files) => {
    // from `files` filter those _NOT_ matching `*test.js`
    const match = micromatch.not(files, "**/mangrove-solidity/lib/**");
    const match1 = micromatch.not(match, "**/vendor/**");
    const match2 = micromatch.not(match1, "**/preprocessed/**");
    return `forge fmt ${match2.join(" ")}`;
  },
  "*.{js,css,md,json}": "prettier --write --ignore-unknown",
};
