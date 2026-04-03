# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY go.mod .
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o api .

# Final stage
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /build/api .
EXPOSE 8080
USER nobody
ENTRYPOINT ["/app/api"]
