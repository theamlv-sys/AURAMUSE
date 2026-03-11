#!/bin/bash
npm run dev &
DEV_PID=$!
sleep 5
echo "Dev server started with PID $DEV_PID"
