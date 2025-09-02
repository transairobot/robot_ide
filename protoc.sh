protoc \
    --plugin=./node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_out=. \
    --ts_proto_opt=globalThisPolyfill=true \
    src/lib/weirui_kernel/host_pb.proto