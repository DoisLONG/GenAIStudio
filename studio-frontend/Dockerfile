FROM registry.cn-hangzhou.aliyuncs.com/jilimoxing/test:node23alpine

# Install necessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache gcompat python3 make g++ git \
    # Needed for pdfjs-dist
    build-base cairo-dev pango-dev \
    # Install Chromium
    chromium && \
    npm config set registry https://registry.npmmirror.com && \
    # Update npm to the latest version
    npm install -g npm@latest && \
    # Install PNPM globally
    npm install -g pnpm@latest 

# Debug step to verify git installation
RUN git --version

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src

# Copy app source
COPY . .

# Install dependencies and build the app
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set store-dir .pnpm-store && \
    pnpm install && \
    pnpm update cross-spawn@7.0.5 && \
    pnpm build && \
    pnpm remove esbuild && \
    rm -rf .pnpm-store && \
    rm -rf /root/.local/share/pnpm && \
    pnpm prune --prod && \
    cd packages/server/node_modules/flowise-ui && \
    pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]