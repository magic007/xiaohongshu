Component({
  properties: {
    note: {
      type: Object,
      value: {}
    },
    type: {
      type: String,
      value: 'image' // 'image' 或 'video'
    }
  },

  data: {
    gradientBg: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)'
  },

  methods: {
    onTapCard() {
      const { note, type } = this.properties;
      this.triggerEvent('tap', { note, type });
    },

    onTapLike() {
      const { note } = this.properties;
      this.triggerEvent('like', { note });
    }
  }
}); 