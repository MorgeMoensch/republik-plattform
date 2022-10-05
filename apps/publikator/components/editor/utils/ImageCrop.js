import { useState, useEffect, useRef, useCallback } from 'react'
import withT from '../../../lib/withT'
import Cropper from 'react-easy-crop'
import { AudioCoverGenerator, Slider } from '@project-r/styleguide'

const PADDING = 15
const SLIDER_HEIGHT = 52

const ImageCrop = ({ onChange, image, format, crop: initialCropArea }) => {
  const [crop, setCrop] = useState(
    initialCropArea
      ? { x: initialCropArea.x, y: initialCropArea.y }
      : { x: 0, y: 0 },
  )
  const [zoom, setZoom] = useState(
    initialCropArea
      ? Math.round(
          (100 / Math.max(initialCropArea.width, initialCropArea.height)) * 10,
        ) / 10
      : 1,
  )
  const [croppedArea, setCroppedArea] = useState(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef()
  useEffect(() => {
    if (!containerRef.current) {
      return
    }
    const measure = () => {
      setContainerWidth(containerRef.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
    }
  }, [])

  const previewSize = containerWidth / 2 - PADDING || 0

  const scale = croppedArea?.width ? 100 / croppedArea.width : 1
  const transform = {
    x: `${croppedArea?.x ? -croppedArea.x * scale : 0}%`,
    y: `${croppedArea?.y ? -croppedArea.y * scale : 0}%`,
    scale,
    width: 'calc(100% + 0.5px)',
    height: 'auto',
  }

  const imageStyle = {
    transform: `translate3d(${transform.x}, ${transform.y}, 0) scale3d(${transform.scale},${transform.scale},1)`,
    width: transform.width,
    height: transform.height,
    transformOrigin: 'top left',
  }

  useEffect(() => {
    // reset state if croparea changes outside of component (for example on "verwerfen")
    if (
      initialCropArea &&
      croppedArea &&
      (initialCropArea.x !== croppedArea.x ||
        initialCropArea.y !== croppedArea.y ||
        initialCropArea.width !== croppedArea.width ||
        initialCropArea.height !== croppedArea.height)
    ) {
      setCrop({ x: initialCropArea.x, y: initialCropArea.y })
      setZoom(
        Math.round(
          (100 / Math.max(initialCropArea.width, initialCropArea.height)) * 10,
        ) / 10,
      )
    }
  }, [initialCropArea])

  useEffect(() => {
    // reset state and metadata if image changes
    onChange(null)
    setCroppedArea(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }, [image])

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    const croppedAreaInt = Object.fromEntries(
      Object.entries(croppedArea).map(([k, v], i) => [k, Math.floor(v)]),
    )
    setCroppedArea(croppedAreaInt)
    onChange(croppedAreaInt)
  })

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {!image ? (
        <AudioCoverGenerator format={format} previewSize={previewSize} />
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              height: previewSize,
              width: previewSize,
              marginBottom: SLIDER_HEIGHT,
            }}
          >
            <Cropper
              image={image}
              aspect={1}
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
            />
            <div
              style={{
                position: 'relative',
                top: containerWidth / 2,
                width: previewSize,
              }}
            >
              <Slider
                fullWidth
                label={'Zoom: ' + zoom}
                value={zoom * 10}
                min='10'
                max='20'
                onChange={(_, zoom) => setZoom(zoom / 10)}
              />
            </div>
          </div>
          <div
            style={{
              position: 'relative',
              left: containerWidth / 2 + PADDING,
              width: previewSize,
              height: previewSize,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                marginBottom: -previewSize,
                paddingBottom: '100%',
              }}
            >
              <img src={image} alt='Preview Crop' style={imageStyle} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default withT(ImageCrop)