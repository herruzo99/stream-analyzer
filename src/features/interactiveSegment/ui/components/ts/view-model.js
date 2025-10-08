/**
 * A utility to build a detailed map of every byte in a Transport Stream segment,
 * associating it with its parent packet, specific field, and a color code for highlighting.
 * @param {object} parsedData - The parsed TS data object from the worker.
 * @returns {Map<number, {packet: object, fieldName: string, color: object}>}
 */
export function buildByteMapTs(parsedData) {
    const byteMap = new Map();
    const colors = {
        header: { bg: 'bg-blue-900/30' },
        af: { bg: 'bg-yellow-900/30' },
        pcr: { bg: 'bg-yellow-700/30' },
        pes: { bg: 'bg-purple-900/30' },
        pts: { bg: 'bg-purple-700/30' },
        dts: { bg: 'bg-purple-600/30' },
        psi: { bg: 'bg-green-900/30' },
        payload: { bg: 'bg-gray-800/20' },
        stuffing: { bg: 'bg-gray-700/20' },
        pointer: { bg: 'bg-cyan-900/30' },
        null: { bg: 'bg-gray-900/40' },
    };

    if (!parsedData || !parsedData.data || !parsedData.data.packets) {
        return byteMap;
    }

    parsedData.data.packets.forEach((packet) => {
        // Map header bytes
        for (let i = 0; i < 4; i++) {
            byteMap.set(packet.offset + i, {
                packet,
                fieldName: 'TS Header',
                color: colors.header,
            });
        }

        let payloadStart = packet.offset + 4;

        // Map adaptation field if it exists
        if (packet.adaptationField) {
            const af = packet.adaptationField;
            const afOffset = packet.fieldOffsets.adaptationField.offset;
            const afLength = af.length.value + 1;
            payloadStart = afOffset + afLength;

            for (let i = 0; i < afLength; i++) {
                byteMap.set(afOffset + i, {
                    packet,
                    fieldName: 'Adaptation Field',
                    color: colors.af,
                });
            }

            // Override with more specific fields within the AF
            if (af.pcr) {
                for (let i = 0; i < af.pcr.length; i++) {
                    byteMap.set(af.pcr.offset + i, {
                        packet,
                        fieldName: 'PCR',
                        color: colors.pcr,
                    });
                }
            }
            if (af.stuffing_bytes) {
                for (let i = 0; i < af.stuffing_bytes.length; i++) {
                    byteMap.set(af.stuffing_bytes.offset + i, {
                        packet,
                        fieldName: 'Stuffing',
                        color: colors.stuffing,
                    });
                }
            }
        }

        // Map pointer field if payload unit start indicator is set
        if (packet.fieldOffsets.pointerField) {
            const { offset, length } = packet.fieldOffsets.pointerField;
            for (let i = 0; i < length; i++) {
                byteMap.set(offset + i, {
                    packet,
                    fieldName: 'Pointer Field & Stuffing',
                    color: colors.pointer,
                });
            }
            payloadStart = offset + length;
        }

        // Map payload
        for (let i = payloadStart; i < packet.offset + 188; i++) {
            if (byteMap.has(i)) continue; // Don't overwrite more specific fields

            let fieldName = 'Payload';
            let color = colors.payload;

            if (packet.pid === 0x1fff) {
                fieldName = 'Null Packet Payload';
                color = colors.null;
            } else if (packet.psi) {
                fieldName = `PSI (${packet.psi.type})`;
                color = colors.psi;
            } else if (packet.pes) {
                fieldName = 'PES Payload';
                color = colors.payload;
            }

            byteMap.set(i, { packet, fieldName, color });
        }

        // Override payload with PES header if present
        if (packet.pes && packet.fieldOffsets.pesHeader) {
            const { offset, length } = packet.fieldOffsets.pesHeader;
            for (let i = 0; i < length; i++) {
                byteMap.set(offset + i, {
                    packet,
                    fieldName: 'PES Header',
                    color: colors.pes,
                });
            }
            if (packet.pes.pts) {
                for (let i = 0; i < packet.pes.pts.length; i++) {
                    byteMap.set(packet.pes.pts.offset + i, {
                        packet,
                        fieldName: 'PTS',
                        color: colors.pts,
                    });
                }
            }
            if (packet.pes.dts) {
                for (let i = 0; i < packet.pes.dts.length; i++) {
                    byteMap.set(packet.pes.dts.offset + i, {
                        packet,
                        fieldName: 'DTS',
                        color: colors.dts,
                    });
                }
            }
        }
    });

    return byteMap;
}
