<!-- License generated by licensor(https://github.com/Marvin9/licensor).

Warpnet - Decentralized Social Network
Copyright (C) 2025 Vadim Filin, https://github.com/Warp-net,
<github.com.mecdy@passmail.net>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

WarpNet is provided “as is” without warranty of any kind, either expressed or implied.
Use at your own risk. The maintainers shall not be liable for any damages or data loss
resulting from the use or misuse of this software.
-->
<template>
  <div
    class="fixed w-full h-full top-0 left-0 flex items-center justify-center"
  >
    <div
      class="absolute w-full h-full bg-gray-900 opacity-50"
      @click.prevent="$emit('update:showNewMessageModal', false)"
    ></div>

    <div
      class="modal-main bg-white mx-auto rounded-lg z-50 overflow-y-auto w-full sm:w-3/5 md:w-2/5 max-h-full"
    >
      <div class="pl-1 pr-4 py-1 h-16 border-b-2 border-lightblue">
        <div class="flex flex-row mt-1 ml-4">
          <i
            @click="$emit('update:showNewMessageModal', false)"
            class="fas fa-times text-blue text-2xl w-10 h-10 mr-1 xl:mr-6 mt-1 pt-1 pl-3 rounded-full bg-white hover:bg-lightblue"
          ></i>
          <p class="text-xl pt-1 font-bold mt-1">New message</p>
        </div>
      </div>

      <div class="border-l-2 border-r-2 border-white">
        <div class="p-3 flex flex-col border-b">
          <div class="lg:block w-full">
            <i class="fas fa-search absolute mt-3 ml-5 text-m text-light"></i>
            <input
              class="pl-12 rounded-full w-full p-2 bg-lighter text-m focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue"
              placeholder="Search People (NOT WORKING)"
              type="search"
              v-on:keyup.enter="submitSearch()"
            />
          </div>
        </div>

        <Loader :loading="loading" />
        <div
          v-if="!loading && this.users && this.users.length === 0"
          class="flex flex-col items-center justify-center w-full pt-10"
        >
          <div class="w-3/5">
            <p class="font-bold text-lg">No results</p>
            <p class="text-sm text-dark">
              The query you entered did not bring up any results.
            </p>
          </div>
        </div>

        <ResultsNewMessage :results="users" :profileId="profileId" @selected="selected" />
      </div>
    </div>
  </div>
</template>

<script>
import {defineAsyncComponent} from "vue";
import {warpnetService} from "@/service/service";

export default {
  name: "NewMessageOverlay",
  components: {
    ResultsNewMessage: defineAsyncComponent(() => import('./ResultsNewMessage.vue')),
    Loader: defineAsyncComponent(() => import('./Loader.vue')),
  },
  props: ["showNewMessageModal", "profileId"],
  data() {
    return {
      loading: false,
      users: [],
    };
  },
  methods: {
    async openChat(user) {
      this.$emit("update:showNewMessageModal", false);
    },
    async submitSearch() {
      // TODO implement search
    },
    selected(user) {
      this.$emit("selected", user);
    },
  },
  async created() {
    console.log("loading component:", this.$options.name);
    if (!this.profileId) {
      console.error("No profile id", this.$options.name)
      return;
    }
    this.loading = true;
    this.users = await warpnetService.getUsers({profileId:this.profileId, cursorReset:true})
    for (const i in this.users) {
      const u = this.users[i]
      this.users[i].avatar = await warpnetService.getImage({userId:u.id, key:u.avatar_key})
    }
    this.loading = false;
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.handleEscape);
  },
  mounted() {
    window.addEventListener("keyup", this.handleEscape);
  },
  unmounted() {
    window.removeEventListener("keyup", this.handleEscape);
  },
};
</script>
