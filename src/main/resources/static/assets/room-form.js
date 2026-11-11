(() => {
  const form = document.querySelector('.room-edit-form');
  const fileInput = document.querySelector('#posterFile');
  const assetSelect = document.querySelector('#posterAssetId');
  const videoInput = document.querySelector('#videoFile');
  const videoSelect = document.querySelector('#mediaAssetId');
  const videoStatus = document.querySelector('#videoUploadStatus');
  const preview = document.querySelector('#posterPreview');
  const status = document.querySelector('#posterUploadStatus');
  if (!form || !fileInput || !assetSelect || !preview || !status) return;
  let videoUploadPending = false;

  const prefix = location.pathname.startsWith('/meiye/') ? '/meiye' : '';
  if (preview.src.includes('/api/rooms/') && prefix && !new URL(preview.src).pathname.startsWith('/meiye/')) {
    preview.src = `${prefix}${new URL(preview.src).pathname}`;
  }

  if (videoInput && videoSelect && videoStatus) {
    const streamUrl = document.querySelector('#streamUrl');
    form.addEventListener('submit', event => {
      if (videoUploadPending) {
        event.preventDefault();
        videoStatus.textContent = '视频仍在上传，请等待上传完成后再保存场次。';
      }
    });
    videoSelect.addEventListener('change', () => {
      if (videoSelect.value) {
        if (streamUrl) streamUrl.value = '';
        videoStatus.textContent = '已选择 COS 视频；点击页面底部「保存场次配置」后，观看端才会使用此视频。';
      }
    });
    streamUrl?.addEventListener('input', () => {
      if (streamUrl.value.trim() && videoSelect.value) {
        videoSelect.value = '';
        videoStatus.textContent = '已改用播放源地址；保存后将使用该地址。';
      }
    });

    videoInput.addEventListener('change', async () => {
      const file = videoInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('video/')) {
        videoStatus.textContent = '请选择有效的视频文件。';
        videoInput.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024 * 1024) {
        videoStatus.textContent = '视频不能超过 2 GB。';
        videoInput.value = '';
        return;
      }

      videoStatus.textContent = `正在上传 ${file.name}（${(file.size / 1048576).toFixed(1)} MB）…`;
      videoUploadPending = true;
      const body = new FormData();
      body.append('file', file);
      const headers = new Headers();
      const token = document.querySelector('meta[name="_csrf"]')?.content;
      const headerName = document.querySelector('meta[name="_csrf_header"]')?.content;
      if (token && headerName) headers.set(headerName, token);
      try {
        const response = await fetch(`${prefix}/api/admin/media`, {
          method: 'POST', credentials: 'same-origin', headers, body
        });
        const asset = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(asset.message || (response.redirected ? '请先登录管理后台。' : '视频上传失败，请检查 COS 配置。'));
        const option = new Option(asset.name, String(asset.id), true, true);
        videoSelect.add(option);
        if (streamUrl) streamUrl.value = '';
        videoStatus.textContent = `已上传并选中：${asset.name}。保存场次配置后生效。`;
      } catch (error) {
        videoStatus.textContent = error.message || '视频上传失败。';
      } finally {
        videoUploadPending = false;
      }
    });
  }

  assetSelect.addEventListener('change', async () => {
    const option = assetSelect.selectedOptions[0];
    if (!option?.value) return;
    try {
      const response = await fetch(`${prefix}/api/admin/media/${encodeURIComponent(option.value)}/url`, {
        credentials: 'same-origin', cache: 'no-store'
      });
      const asset = await response.json();
      if (!response.ok) throw new Error('封面预览加载失败。');
      preview.src = asset.url;
    } catch (error) {
      status.textContent = error.message || '封面预览加载失败。';
    }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      status.textContent = '封面仅支持 JPG、PNG 或 WebP 图片。';
      fileInput.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      status.textContent = '封面图片不能超过 10 MB。';
      fileInput.value = '';
      return;
    }

    status.textContent = '正在上传封面到 COS…';
    const body = new FormData();
    body.append('file', file);
    const headers = new Headers();
    const token = document.querySelector('meta[name="_csrf"]')?.content;
    const headerName = document.querySelector('meta[name="_csrf_header"]')?.content;
    if (token && headerName) headers.set(headerName, token);
    try {
      const response = await fetch(`${prefix}/api/admin/media/images`, {
        method: 'POST', credentials: 'same-origin', headers, body
      });
      const asset = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(asset.message || (response.redirected ? '请先登录管理后台。' : '封面上传失败，请检查 COS 配置。'));

      const option = new Option(asset.name, String(asset.id), true, true);
      option.dataset.url = asset.url;
      assetSelect.add(option);
      preview.src = asset.url;
      status.textContent = '封面已上传并选中，请保存场次配置以应用到观看端。';
    } catch (error) {
      status.textContent = error.message || '封面上传失败。';
    }
  });
})();
