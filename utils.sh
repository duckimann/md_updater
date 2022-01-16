#!/bin/bash

case $1 in

	build)
		docker build -t md_updater .;
		;;

	testbuild)
		docker compose down; docker rmi md_updater;
		docker build -t md_updater .;
		docker compose up -d;
		docker logs --tail 50 --follow --timestamps md_updater || docker compose down;
		;;

	*)
		echo -n "Unknown Command Param."
		;;
esac